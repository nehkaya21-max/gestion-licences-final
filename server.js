const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());

// Augmenter la limite de taille pour accepter les photos en Base64
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "prosport" // Vérifie que c'est bien le nom dans phpMyAdmin
});

db.connect(err => {
    if (err) throw err;
    console.log("Connecté à la base de données MySQL !");
});

// 1. ROUTE POUR L'INCREMENTATION
app.get('/prochain-numero', (req, res) => {
    // On compte combien il y a de lignes pour définir le prochain rang
    const sql = "SELECT COUNT(*) AS total FROM joueurs";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);

        // On récupère le nombre actuel
        const totalActuel = result[0].total;
        const prochainId = totalActuel + 1;

        // On formate avec les 3 chiffres (001, 002...)
        const numeroFormate = `S-K26-J-${prochainId.toString().padStart(3, '0')}`;

        console.log("Prochain matricule généré :", numeroFormate); // Vérifie ton terminal node !
        res.json({ numero: numeroFormate });
    });
});

// 2. ROUTE POUR ENREGISTRER LE JOUEUR (CORRIGÉE)
app.post('/ajouter', (req, res) => {
    // ON AJOUTE "photo" ICI
    const { nom, prenoms, dateNaissance, equipe, poste, numero, photo } = req.body;

    // ON AJOUTE "photo" DANS LA REQUÊTE SQL
    const sql = "INSERT INTO joueurs (nom, prenoms, dateNaissance, equipe, poste, numero_licence, photo) VALUES (?, ?, ?, ?, ?, ?, ?)";

    db.query(sql, [nom, prenoms, dateNaissance, equipe, poste, numero, photo], (err, result) => {
        if (err) {
            console.error("Détail de l'erreur SQL :", err);
            return res.status(500).json(err);
        }
        res.json({ message: "Succès !" });
    });
});

// 3. ROUTE POUR RECHERCHER UN JOUEUR
app.get('/joueur/:id', (req, res) => {
    const sql = "SELECT * FROM joueurs WHERE numero_licence = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.length > 0) {
            res.json(result[0]); // Renvoie toutes les colonnes, y compris la photo
        } else {
            res.status(404).json({ message: "Joueur non trouvé" });
        }
    });
});

app.listen(5000, () => {
    console.log("Serveur lancé sur le port 5000");
});