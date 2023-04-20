// @ts-check
/* global harden */
import '@agoric/zoe/exported.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';

/**
 * This is a very simple contract that creates a new issuer and mints payments
 * from it, in order to give an example of how that can be done. This contract
 * sends new tokens to anyone who has an invitation.
 *
 * The expectation is that most contracts that want to do something similar
 * would use the ability to mint new payments internally rather than sharing
 * that ability widely as this one does.
 *
 * To pay others in tokens, the creator of the instance can make
 * invitations for them, which when used to make an offer, will payout
 * the specified amount of tokens.
 *
 * @type {ContractStartFn}
 */
const start = async (zcf) => {
  // Factory for token minters that accepts keyword which also acts
  // as the allegedName.
  const minterFactory = async (keyword) => {
    // Create an internal Zoe mint. Note that makeZCFMint defaults
    // to AssetKind.NAT which is used for fungible assets.
    const zcfMint = await zcf.makeZCFMint(keyword);
    // Now that ZCF has saved the issuer and brand, we can
    // access them synchronously.
    const { issuer, brand } = zcfMint.getIssuerRecord();

    /** @type {OfferHandler} */
    const mintPayment = (seat) => {
      const amount = AmountMath.make(brand, 1000n);
      // Synchronously mint and allocate amount to seat.
      zcfMint.mintGains(harden({ Token: amount }), seat);
      // Exit the seat so that the user gets a payout.
      seat.exit();
      // Since the user is getting the payout through Zoe, we can
      // return anything here. Let's return some helpful instructions.
      return 'Offer completed. You should receive a payment from Zoe';
    };

    return { mintPayment, issuer };
  };

  const { mintPayment, issuer } = await minterFactory('Token');
  const { mintPayment: mintYapPayment, issuer: yapIssuer } =
    await minterFactory('Yap');

  const creatorFacet = Far('creatorFacet', {
    // The creator of the instance can send invitations to anyone
    // they wish to.
    makeInvitation: () =>
      zcf.makeInvitation(mintPayment, 'mint a Token payment'),
    makeYapInvitation: () =>
      zcf.makeInvitation(mintYapPayment, 'mint a Yap payment'),
    getTokenIssuer: () => issuer,
    getYapIssuer: () => yapIssuer,
  });

  const publicFacet = Far('publicFacet', {
    // Make the token issuer public. Note that only the mint can
    // make new digital assets. The issuer is ok to make public.
    getTokenIssuer: () => issuer,
    getYapIssuer: () => yapIssuer,
  });

  // Return the creatorFacet to the creator, so they can make
  // invitations for others to get payments of tokens. Publish the
  // publicFacet.
  return harden({ creatorFacet, publicFacet });
};

harden(start);
export { start };
