const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const cors      = require('cors')({ origin: true });
const stripe    = require('stripe')(functions.config().stripe.secret);

admin.initializeApp();

exports.createCheckoutSession = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      return res.status(405).send('Method Not Allowed');
    }

    // Verificar token Firebase
    const authHeader = req.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') && authHeader.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).send('Unauthorized');
    }
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).send('Unauthorized');
    }

    // Obtener reserva
    const { reservationId } = req.body;
    const snap = await admin.firestore()
      .collection('reservations').doc(reservationId).get();
    if (!snap.exists) {
      return res.status(404).send('Reserva no encontrada');
    }
    const data = snap.data();

    // Crear sesión Stripe
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Reserva: ${data.roomId}`,
            },
            unit_amount: Math.round(data.total * 100),
          },
          quantity: 1,
        }],
        customer_email: data.email,
        success_url: 'http://localhost:5500/payment-success.html?session_id={CHECKOUT_SESSION_ID}',
        cancel_url:  'http://localhost:5500/booking.html?room=' + data.roomId,
        metadata: { reservationId }
      });
      return res.json({ sessionId: session.id });
    } catch (err) {
      console.error('Stripe error:', err);
      return res.status(500).send('Error al crear sesión de pago');
    }
  });
});
