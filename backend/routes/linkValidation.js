const express = require('express');
const router = express.Router();

// List of correct links
const correctLinks = [
  '/roundtwo-a1b2c3d4e5f6789',
  '/roundtwo-ff774ffhhi287',
  '/roundtwo-x9y8z7w6v5u4321',
  '/roundtwo-mn34op56qr78st90',
  '/roundtwo-abcd1234efgh5678',
  '/roundtwo-xyz987uvw654rst3',
  '/roundtwo-qwerty123uiop456',
  '/roundtwo-lmn678opq234rst9',
  '/roundtwo-98zyx765wvu43210',
  '/roundtwo-ghijklm456nop789',
  '/roundtwo-pqrstu123vwxyz45',
  '/roundtwo-abc987def654ghi32',
  '/roundtwo-klmno123pqrst456',
  '/roundtwo-uvwxyz9876543210',
  '/roundtwo-qwert678yuiop234'
];

// Validate link route
router.post('/validate-link', (req, res) => {
  const { link } = req.body;
  if (correctLinks.includes(link)) {
    // Generate a token for the correct link
    const token = link.split('-')[1]; // Use part of the link as token
    return res.json({ success: true, token });
  }
  return res.json({ success: false });
});

module.exports = router;
