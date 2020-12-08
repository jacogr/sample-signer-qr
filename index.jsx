import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { QrDisplayPayload, QrScanSignature } from '@polkadot/react-qr';
import { CMD_SIGN_TX } from '@polkadot/react-qr/constants';
import { u8aToHex } from '@polkadot/util';

const WS_ENDPOINT = 'wss://kusama-rpc.polkadot.io';
const ADDR_FROM = 'J7LbEaKaDuPwnNS9BT4xmscBn7GwzvCRwKbQuC82KdQRHxW';
const ADDR_TO = 'HqfMqd2sod4pN5L1HfUD1h9VLiaKfekeGcesnSz7dKDXJdg';

// the actual App
function App ({ genesisHash, tx }) {
  // store the actual raw payload and signer resolve as transmitted to the QR
  const [qr, setQrInfo] = useState();

  // immediately send the tx upon loading the component the first time
  // (not quite best-practice, but this woks as an e2e test)
  useEffect(async () => {
    // setup a signer (bare-minimum, only to decorate the QR)
    const signer = {
      signPayload: (payload) => {
        console.log('(sign)', payload);

        // create the actual payload we will be using
        const xp = tx.registry.createType('ExtrinsicPayload', payload);

        // send to the QR with the actual resolution
        return new Promise((resolve) => {
          // since this is sent as a QR, we do include the length prefix
          setQrInfo({
            payload: xp.toU8a(),
            scanned: (signature) => {
              // log the actual data & signature (here no length prefix, actual signed)
              console.log({ data: u8aToHex(xp.toU8a(true)), signature });

              // resolve with an id and the signature as retrieved
              resolve({ id: 1, signature });
            }
          });
        });
      }
    }

    // sign and send, logging all states (this is equivalent to `await signAsync(...)` followed by `send(...)`)
    const unsub = await tx.signAndSend(ADDR_FROM, { signer }, ({ status, dispatchError, dispatchInfo, events, isError }) => {
      console.log(`(status) ${status.toString()}`);

      // these are for errors that are thrown via the txpool, the tx didn't make it into a block
      if (isError) {
        unsub();
      } else if (status.isInBlock) {
        // all the extrinsic events, if available (this may include failed,
        // where we have the dispatchError extracted)
        // https://polkadot.js.org/docs/api/cookbook/blocks#how-do-i-map-extrinsics-to-their-events
        if (events) {
          console.log('(events/system)', events.map(({ event: { data, method, section } }) =>
            `${section}.${method}${data ? `(${JSON.stringify(data.toHuman())})` : ''}`
          ));
        }

        // this is part of the ExtrinsicSuccess/ExtrinsicFailed event, the API extracts it from those
        // (which mans it will match with whatever Success/Failed events above are showing)
        console.log(`(dispatch) ${JSON.stringify(dispatchInfo.toHuman())}`);

        // The dispatchError is extracted from the system ExtrinsicFailed event above
        // (so will match the details there, the API conveinence helper extracts it to ease-of-use)
        if (dispatchError) {
          // show the actual errors as received here by looking up the indexes against the registry
          // https://polkadot.js.org/docs/api/cookbook/tx#how-do-i-get-the-decoded-enum-for-an-extrinsicfailed-event
          if (dispatchError.isModule) {
            // for module errors, we have the section indexed, lookup
            const decoded = tx.registry.findMetaError(dispatchError.asModule);
            const { documentation, name, section } = decoded;

            console.log(`(error) ${section}.${name}: ${documentation.join(' ')}`);
          } else {
            // Other, CannotLookup, BadOrigin, no extra info
            console.log(`(error) ${JSON.stringify(dispatchError.toHuman())}`);
          }
        }

        unsub();
      }
    });
  }, []);

  const onScan = useCallback(
    ({ signature }) => qr.scanned(signature),
    [qr]
  );

  return (
    <div style={{ display: 'flex' }}>
      {qr && (
        <>
          <QrDisplayPayload
            address={ADDR_FROM}
            cmd={CMD_SIGN_TX}
            genesisHash={genesisHash}
            payload={qr.payload}
            size={300}
          />
          <QrScanSignature
            onScan={onScan}
            size={300}
          />
        </>
      )}
    </div>
  );
}

// our main entry point - setup the API, init the app
async function main () {
  const api = await ApiPromise.create({
    provider: new WsProvider(WS_ENDPOINT)
  });

  // transfer 0.001 KSM (< 1.6m existential, so won't create the account)
  const tx = api.tx.balances.transfer(ADDR_TO, 1000000000);

  ReactDOM.render(
    <App
      genesisHash={api.genesisHash}
      tx={tx}
    />,
    document.getElementById('root')
  );
}

main().catch(console.error);
