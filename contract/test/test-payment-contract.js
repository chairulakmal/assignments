import { test } from './prepare-test-env-ava.js';
import bundleSource from '@endo/bundle-source';
import path from 'path';

import { E } from '@endo/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { AmountMath } from '@agoric/ertp';

// @ts-ignore
const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractPath = `${dirname}/../src/transfer-contract.js`;

test('transfer', async (t) => {
  const { zoeService } = makeZoeKit(makeFakeVatAdmin().admin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // pack the contract
  const bundle = await bundleSource(contractPath);

  // install the contract
  const installation = E(zoe).install(bundle);
  const { creatorFacet, instance } = await E(zoe).startInstance(installation);

  // check that creatorFacet and instance is present at this point
  t.truthy(creatorFacet);
  t.truthy(instance);

  // Alice makes an invitation for Bob that will give him 1000 tokens
  const invitation = E(creatorFacet).makeTransferInvitation();

  // Bob makes an offer using the invitation
  const seat = E(zoe).offer(invitation);
  const paymentP = E(seat).getPayout('Zero');

  // Let's get the tokenIssuer from the contract so we can evaluate
  // what we get as our payout
  const publicFacet = E(zoe).getPublicFacet(instance);
  const issuer = E(publicFacet).getIssuer();
  const tokenBrand = await E(issuer).getBrand();

  const tokens1000 = AmountMath.make(tokenBrand, 1000n);
  const tokenPayoutAmount = await E(issuer).getAmountOf(paymentP);

  // Confirm that Bob gets 1000 tokens
  t.deepEqual(tokenPayoutAmount, tokens1000);
});
