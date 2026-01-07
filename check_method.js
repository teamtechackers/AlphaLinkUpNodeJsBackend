
const UserProfileController = require('./src/controllers/userProfileController');
console.log('Class:', UserProfileController);
console.log('Method:', UserProfileController.requestAccountDeletion);
if (typeof UserProfileController.requestAccountDeletion === 'function') {
    console.log('Method exists and is a function');
} else {
    console.log('Method is MISSING or strictly undefined');
}
