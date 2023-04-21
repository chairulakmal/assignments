// @ts-check
/* global harden */
import '@agoric/zoe/exported.js';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { assert } from '@agoric/assert';

// Create a new contract;
// Mint some tokens on startup into a zcfSeat;
// Create a function that allows a transfer of some of the minted tokens to a userSeat;
// Create a new test file for the contract above;

/**
 * This is a simple contract that creates a new token issuer, immediately
 * mint some tokens to the zcfSeat and allow token transfers to userSeat.
 *
 * @type {ContractStartFn}
 */

const start = async (zcf) => {
  // create internal NFT mint
  const zcfMint = await zcf.makeZCFMint('Zero', AssetKind.NAT);

  const { issuer, brand } = zcfMint.getIssuerRecord();
  const { zcfSeat } = zcf.makeEmptySeatKit();

  // minter function
  const mintPayment = (seat, value = 1000n) => {
    const amount = AmountMath.make(brand, value);
    zcfMint.mintGains(harden({ Token: amount }), seat);
    seat.exit();
    return 'Offer completed. You should receive a payment from Zoe';
  };

  // mint tokens to the zcfSeat at startup
  mintPayment(zcfSeat);

  /** @type {OfferHandler} */
  const transferPayment = (seat) => {
    // Get the offer proposals from the userSeat
    const {
      want: { Zero: amount },
    } = seat.getProposal();

    // substract some tokens from zcfSeat and immediately add the
    // same amount to the userSeat
    seat.incrementBy(zcfSeat.decrementBy(harden({ Zero: amount })));

    // commits the staged allocations for each of its seat arguments
    zcf.reallocate(seat, zcfSeat);

    // exit the seat and complete the transaction
    // note that exit() is for successful operations
    // use fail() when you want to exit with an error
    seat.exit();

    // return a useful information to the user
    return 'Transfer completed. You should receive a payment from Zoe';
  };

  const creatorFacet = Far('creatorFacet', {
    getIssuer: () => issuer,
    makeTransferInvitation: () =>
      zcf.makeInvitation(transferPayment, 'transfer'),
  });

  const publicFacet = Far('publicFacet', {
    getIssuer: () => issuer,
  });

  return harden({ creatorFacet, publicFacet });
};

harden(start);
export { start };
