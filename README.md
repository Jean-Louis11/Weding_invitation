# Wedding Invitation Management System

Application web de gestion d'invitations de mariage avec frontend React/Vite et backend Django API.

## Fonctionnalités

- **Page d'invitation publique** : Design élégant avec thème doré, affichage des informations du mariage, formulaire RSVP
- **Dashboard administrateur** : Gestion des invités, suivi des RSVP, modification des informations du mariage
- **Authentification sécurisée** : Connexion admin avec username/mot de passe du superuser Django
- **Téléchargement PDF** : Génération d'une invitation PDF fidèle au design de la page
- **Envoi WhatsApp** : Bouton d'envoi du lien d'invitation via WhatsApp depuis le dashboard

## Stack technique

- **Backend** : Django 5.2 + SQLite
- **Frontend** : React 19 + Vite 7 + Tailwind CSS 4 + TypeScript
- **PDF** : html2canvas + jsPDF

## Installation

### Prérequis

- Python 3.13+
- Node.js 24+

### Backend

```bash
cd D:\Projets_Django\Weding_invitation

# Créer l'environnement virtuel
python -m venv venv
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
cd Weding_invitation
python manage.py migrate

# Créer un superuser
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

### Frontend

```bash
cd D:\Projets_Django\Weding_invitation\Weding_invitation\templates\wedding-invitation-management-website

# Installer les dépendances
npm install

# Build pour la production
npm run build
```

## Utilisation

### Page d'invitation

Accéder à l'invitation d'un invité :
```
http://127.0.0.1:8000/?invite=<token>
```

### Dashboard administrateur

Accéder au panneau d'administration :
```
http://127.0.0.1:8000/?admin=true
```

Se connecter avec les identifiants du superuser Django.

## Structure du projet

```
Weding_invitation/
├── .gitignore
├── requirements.txt
├── README.md
├── venv/                          # Environnement virtuel Python
└── Weding_invitation/             # Dossier Django
    ├── db.sqlite3                 # Base de données SQLite
    ├── manage.py
    ├── static/                    # Fichiers statiques (images)
    │   └── images/
    │       └── Decorations.JPEG
    ├── templates/                 # Templates React buildés
    │   └── wedding-invitation-management-website/
    │       ├── dist/              # Build de production
    │       ├── src/               # Source React
    │       └── package.json
    └── Weding_invitation/         # Configuration Django
        ├── settings.py
        ├── urls.py
        └── wsgi.py
```

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/admin/login/` | Connexion administrateur |
| POST | `/api/admin/logout/` | Déconnexion |
| GET | `/api/admin/check/` | Vérifier l'authentification |
| GET | `/api/guests/` | Liste des invités |
| POST | `/api/guests/` | Ajouter un invité |
| DELETE | `/api/guests/<id>/` | Supprimer un invité |
| GET | `/api/guests/by-token/<token>/` | Récupérer un invité par token |
| POST | `/api/rsvp/<token>/` | Soumettre un RSVP |
| GET | `/api/wedding-info/` | Informations du mariage |
| PUT | `/api/wedding-info/` | Modifier les informations |

## Licence

Projet privé.
