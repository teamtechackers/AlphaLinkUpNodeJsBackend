const fs = require('fs');
let content = fs.readFileSync('src/controllers/apiController.js', 'utf8');
content = content.replace("qr_image: user.qr_image ? `${process.env.BASE_URL || 'http://192.168.0.100:3000'}/${user.qr_image}`", "qr_image: user.qr_image ? `${process.env.BASE_URL || 'http://192.168.0.100:3000'}/uploads/qr_codes/${user.qr_image}`");
fs.writeFileSync('src/controllers/apiController.js', content);
