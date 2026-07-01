import React, { useState, useEffect } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    dateNaissance: '',
    equipe: '',
    poste: '',
    numero: '', // C'est ici que le matricule est stocké
    photo: ''
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [searchId, setSearchId] = useState('');

  // 1. CHARGEMENT DU MATRICULE AU DÉMARRAGE
  useEffect(() => {
    chargerProchainNumero();
  }, []);

  // FORCE LE RETOUR DU MATRICULE DEPUIS LE DOSSIER CLIENT
  const chargerProchainNumero = async () => {
    try {
      // On utilise une route relative ou absolue vers ton port 5000
      const res = await axios.get('http://localhost:5000/prochain-numero');
      if (res.data && res.data.numero) {
        setFormData(prev => ({ ...prev, numero: res.data.numero }));
      }
    } catch (err) {
      console.error("Erreur de récupération du numéro, tentative alternative...");
      // Secours automatique si le proxy bloque
      try {
        const resAlt = await axios.get('/prochain-numero');
        if (resAlt.data && resAlt.data.numero) {
          setFormData(prev => ({ ...prev, numero: resAlt.data.numero }));
        }
      } catch (e) {
        console.error("Le serveur Node ne répond pas sur /prochain-numero");
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPhotoPreview(base64String);
        setFormData(prev => ({ ...prev, photo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const rechercherJoueur = async () => {
    if (!searchId) return alert("Entrez un numéro de licence");
    try {
      const res = await axios.get(`http://localhost:5000/joueur/${searchId}`);
      if (res.data) {
        setFormData({
          nom: res.data.nom,
          prenoms: res.data.prenoms,
          dateNaissance: res.data.dateNaissance,
          equipe: res.data.equipe,
          poste: res.data.poste,
          numero: res.data.numero_licence,
          photo: res.data.photo
        });
        setPhotoPreview(res.data.photo);
        alert("Joueur et photo retrouvés !");
      }
    } catch (err) {
      alert("Joueur introuvable avec cet ID.");
    }
  };

  // SAUVEGARDE ET INCRÉMENTATION SÉCURISÉE
  // SAUVEGARDE ET INCRÉMENTATION SÉCURISÉE (VERSION CLIENT-SIDE BACKUP)
  const enregistrerJoueur = async (e) => {
    e.preventDefault();

    try {
      // 1. On tente l'envoi au serveur
      await axios.post('http://localhost:5000/ajouter', formData);
      alert("Données et photo enregistrées avec succès !");

      // 2. On essaie de récupérer le numéro officiel du serveur
      try {
        const res = await axios.get('http://localhost:5000/prochain-numero');

        // Si le serveur renvoie encore le 001 alors qu'on vient d'enregistrer, 
        // on force l'incrémentation manuellement ici pour débloquer l'interface !
        if (res.data.numero === formData.numero) {
          const numeroActuel = parseInt(formData.numero.split('-').pop(), 10);
          const suivant = numeroActuel + 1;
          const nouveauNumeroManuel = `S-K26-J-${suivant.toString().padStart(3, '0')}`;

          setFormData({
            nom: '', prenoms: '', dateNaissance: '', equipe: '', poste: '', photo: '',
            numero: nouveauNumeroManuel
          });
        } else {
          // Si le serveur a bien fait son travail, on prend sa valeur
          setFormData({
            nom: '', prenoms: '', dateNaissance: '', equipe: '', poste: '', photo: '',
            numero: res.data.numero
          });
        }
      } catch (errNo) {
        // Secours total : si même le GET du serveur plante, on incrémente à la main
        const numeroActuel = parseInt(formData.numero.split('-').pop(), 10) || 1;
        const suivant = numeroActuel + 1;
        setFormData({
          nom: '', prenoms: '', dateNaissance: '', equipe: '', poste: '', photo: '',
          numero: `S-K26-J-${suivant.toString().padStart(3, '0')}`
        });
      }

      setPhotoPreview(null);

    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement SQL.");
    }
  };

  const tirerLicence = () => {
    const element = document.getElementById('carte-joueur');
    const options = {
      margin: 0,
      filename: `Licence_${formData.nom}_${formData.numero}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: [85, 120], orientation: 'portrait' }
    };
    html2pdf().from(element).set(options).save();
  };

  return (
    <div className="container-fluid py-4 bg-dark min-vh-100">
      <div className="row justify-content-center">

        <div className="col-lg-4 mb-4">
          {/* SECTION RECHERCHE */}
          <div className="card shadow p-3 mb-3 bg-light">
            <label className="fw-bold mb-1">Retrouver une licence :</label>
            <div className="d-flex">
              <input type="text" className="form-control me-2" placeholder="Ex: S-K26-J-001"
                value={searchId} onChange={(e) => setSearchId(e.target.value)} />
              <button onClick={rechercherJoueur} className="btn btn-warning fw-bold">Chercher</button>
            </div>
          </div>

          {/* FORMULAIRE DE SAISIE */}
          <div className="card shadow p-4">
            <h4 className="text-success text-center mb-4">Saisie Licence S-K26</h4>
            <form onSubmit={enregistrerJoueur}>
              <label className="small fw-bold">Photo du joueur</label>
              <input type="file" className="form-control mb-3" onChange={handlePhotoChange} accept="image/*" />

              <input type="text" name="nom" placeholder="Nom" className="form-control mb-2" value={formData.nom} onChange={handleChange} required />
              <input type="text" name="prenoms" placeholder="Prénoms" className="form-control mb-2" value={formData.prenoms} onChange={handleChange} required />
              <input type="date" name="dateNaissance" className="form-control mb-2" value={formData.dateNaissance} onChange={handleChange} />
              <input type="text" name="equipe" placeholder="Équipe" className="form-control mb-2" value={formData.equipe} onChange={handleChange} />
              <input type="text" name="poste" placeholder="Poste" className="form-control mb-3" value={formData.poste} onChange={handleChange} />

              <label className="small fw-bold text-primary">N° MATRICULE AUTOMATIQUE</label>
              <input type="text" className="form-control mb-3 fw-bold text-danger" value={formData.numero} readOnly placeholder="En attente du serveur..." />

              <button type="submit" className="btn btn-primary w-100 mb-2 fw-bold">SAUVEGARDER EN BD</button>
              <button type="button" onClick={tirerLicence} className="btn btn-success w-100 fw-bold">IMPRIMER PDF</button>
            </form>
          </div>
        </div>

        {/* APERÇU DE LA LICENCE */}
        <div className="col-lg-4 d-flex justify-content-center">
          <div id="carte-joueur" className="licence-box">
            <div className="watermark"><img src="/logo_gauche.png" alt="" /></div>
            <div className="licence-header">
              <img src="/logo_gauche.png" className="logo-img" alt="" />
              <div className="header-text"><h6>COMITÉ SETISPORT</h6><p>ÉDITION 2026</p></div>
              <img src="/logo_coupe.png" className="logo-img" alt="" />
            </div>
            <div className="badge-type">LICENCE JOUEUR</div>

            <div className="photo-container">
              {photoPreview ? (
                <img src={photoPreview} alt="Profil" />
              ) : (
                <div className="placeholder-photo">PHOTO</div>
              )}
            </div>

            <div className="info-section">
              <p><strong>Nom:</strong> <span className="dots">{formData.nom}</span></p>
              <p><strong>Prénoms:</strong> <span className="dots">{formData.prenoms}</span></p>
              <p>
                <strong>Né(e) le:</strong>{' '}
                <span className="dots">
                  {formData.dateNaissance
                    ? formData.dateNaissance.split('-').reverse().join('/')
                    : ''}
                </span>
              </p>
              <p><strong>Équipe :</strong> <span className="dots">{formData.equipe}</span></p>
              <p><strong>Poste :</strong> <span className="dots">{formData.poste}</span></p>

              {/* RÈGLAGE DU TEXTE ET TAILLE RÉDUITE ICI */}
              <p className="ligne-matricule" style={{ fontSize: '11px', marginTop: '4px' }}>
                <strong>Matricule:</strong> <span className="dots" style={{ fontSize: '10px', color: '#dc3545', fontWeight: 'bold' }}>{formData.numero || "Non généré"}</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;