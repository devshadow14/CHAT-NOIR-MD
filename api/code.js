// api/code.js
// Proxy HTTPS -> HTTP : le site interroge cette route en boucle pour savoir
// si le code de pairing est prêt.

const KATABUMP_API = 'http://51.75.118.151:20269';

export default async function handler(req, res) {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
        return res.status(400).json({ status: 'error', message: 'Numéro manquant.' });
    }

    try {
        const response = await fetch(`${KATABUMP_API}/api/code/${phoneNumber}`);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error('Erreur proxy /api/code :', err.message);
        res.status(502).json({ status: 'error', message: 'Serveur injoignable.' });
    }
}
