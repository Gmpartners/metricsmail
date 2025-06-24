const express = require('express');
const router = express.Router({ mergeParams: true });
const accountsController = require('../controllers/accountsController');

router.get('/:accountId/mautic/emails/search', accountsController.getMauticEmails);
router.get('/:accountId/mautic/emails/:emailId', accountsController.getMauticEmailDetails);
router.get('/:accountId/mautic/emails', accountsController.getMauticEmails);

router.get('/compare', accountsController.compareAccounts);

router.get('/', accountsController.listAccounts);

router.post('/', accountsController.createAccount);

router.put('/:accountId', accountsController.updateAccount);

router.delete('/:accountId', accountsController.deleteAccount);

router.get('/:accountId/webhook', accountsController.getAccountWebhook);

router.post('/:accountId/test', accountsController.testConnection);

router.get('/:accountId', accountsController.getAccountDetails);

module.exports = router;
