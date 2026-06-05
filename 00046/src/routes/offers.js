const express = require('express');
const {
  calculateCompensation,
  createOffer,
  submitForApproval,
  approveOffer,
  rejectOfferApproval,
  acceptOffer,
  declineOffer,
  negotiateOffer,
  updateOffer,
  withdrawOffer,
  getOffer,
  getOffers
} = require('../controllers/offerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'hr', 'hiring_manager'), getOffers)
  .post(authorize('admin', 'hr'), createOffer);

router.route('/calculate-compensation')
  .post(authorize('admin', 'hr', 'hiring_manager'), calculateCompensation);

router.route('/:offerId')
  .get(authorize('admin', 'hr', 'hiring_manager'), getOffer)
  .put(authorize('admin', 'hr'), updateOffer);

router.route('/:offerId/submit-approval')
  .post(authorize('admin', 'hr'), submitForApproval);

router.route('/:offerId/approve')
  .post(authorize('admin', 'hr_manager'), approveOffer);

router.route('/:offerId/reject-approval')
  .post(authorize('admin', 'hr_manager'), rejectOfferApproval);

router.route('/:offerId/accept')
  .post(acceptOffer);

router.route('/:offerId/decline')
  .post(declineOffer);

router.route('/:offerId/negotiate')
  .post(negotiateOffer);

router.route('/:offerId/withdraw')
  .post(authorize('admin', 'hr'), withdrawOffer);

module.exports = router;
