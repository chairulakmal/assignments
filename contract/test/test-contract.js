// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test } from './prepare-test-env-ava.js';
import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { AmountMath } from '@agoric/ertp';

// @ts-ignore
const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractPath = `${dirname}/../src/contract.js`;

test('zoe - mint payments', async (t) => {
  const { zoeService } = makeZoeKit(makeFakeVatAdmin().admin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // pack the contract
  const bundle = await bundleSource(contractPath);

  // install the contract
  const installation = E(zoe).install(bundle);

  const { creatorFacet, instance } = await E(zoe).startInstance(installation);

  // Alice makes an invitation for Bob that will give him 1000 tokens
  const invitation = E(creatorFacet).makeInvitation();

  // Bob makes an offer using the invitation
  const seat = E(zoe).offer(invitation);

  const paymentP = E(seat).getPayout('Token');

  // Let's get the tokenIssuer from the contract so we can evaluate
  // what we get as our payout
  const publicFacet = E(zoe).getPublicFacet(instance);
  const tokenIssuer = E(publicFacet).getTokenIssuer();
  const tokenBrand = await E(tokenIssuer).getBrand();

  const tokens1000 = AmountMath.make(tokenBrand, 1000n);
  const tokenPayoutAmount = await E(tokenIssuer).getAmountOf(paymentP);

  // Bob got 1000 tokens
  t.deepEqual(tokenPayoutAmount, tokens1000);

  // week-2 start
  const yapIssuer = await E(publicFacet).getYapIssuer();
  const yapBrand = await E(yapIssuer).getBrand();

  // create new token
  const yap1000 = AmountMath.make(yapBrand, 1000n);

  // compare both issuers and amounts of both tokens
  t.notDeepEqual(yapIssuer, tokenIssuer);
  t.notDeepEqual(yapBrand, tokenBrand);
  t.notDeepEqual(yap1000, tokens1000);
  // week-2 end
});
