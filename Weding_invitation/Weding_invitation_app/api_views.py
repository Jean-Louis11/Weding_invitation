"""
Vues API pour l'application d'invitation de mariage.
Toutes les réponses sont en JSON avec des clés camelCase.
Pas d'utilisation de Django REST Framework — uniquement des vues Django classiques.
"""

import json
import functools
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.utils import timezone

from .models import Guest, WeddingInfo


# ──────────────────────────────────────────────
# Constantes par défaut pour WeddingInfo
# ──────────────────────────────────────────────

WEDDING_INFO_DEFAULTS = {
    'groom_name': 'Alexandre',
    'bride_name': 'Camille',
    'date': '2026-09-12',
    'time': '14:00',
    'venue_name': 'Château de Versailles',
    'venue_address': 'Place d\'Armes, 78000 Versailles, France',
    'reception_time': '18:00',
    'reception_venue': 'Orangerie du Château de Versailles',
    'reception_address': 'Place d\'Armes, 78000 Versailles, France',
    'dress_code': 'Tenue de soirée élégante',
    'rsvp_deadline': '2026-07-01',
}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def get_wedding_info():
    """
    Récupère l'instance unique de WeddingInfo (pk=1).
    Retourne None si aucune information n'est enregistrée.
    """
    try:
        info = WeddingInfo.objects.get(pk=1)
        return info
    except WeddingInfo.DoesNotExist:
        return None


def json_error(message, status=400):
    """Retourne une réponse JSON d'erreur standardisée."""
    return JsonResponse({'error': message}, status=status)


def parse_json_body(request):
    """
    Parse le corps JSON de la requête.
    Retourne (data, None) en cas de succès, ou (None, JsonResponse) en cas d'erreur.
    """
    try:
        data = json.loads(request.body)
        return data, None
    except (json.JSONDecodeError, ValueError):
        return None, json_error("Corps de requête JSON invalide.")


# ──────────────────────────────────────────────
# Décorateur d'authentification admin
# ──────────────────────────────────────────────

def admin_required(view_func):
    """
    Décorateur qui vérifie que l'utilisateur est authentifié et est staff.
    Utilise functools.wraps pour préserver les métadonnées de la vue.
    """
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_staff:
            return json_error("Authentification requise.", status=401)
        return view_func(request, *args, **kwargs)
    return wrapper


# ══════════════════════════════════════════════
# ENDPOINTS ADMIN (authentification)
# ══════════════════════════════════════════════

@csrf_exempt
@require_http_methods(["POST"])
def admin_login(request):
    """
    POST /api/admin/login/
    Connexion admin avec username et mot de passe du superuser.
    """
    data, error = parse_json_body(request)
    if error:
        return error

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return json_error("Le nom d'utilisateur et le mot de passe sont requis.")

    user = authenticate(request, username=username, password=password)
    if user is None:
        return json_error("Identifiants incorrects.", status=401)

    if not user.is_staff:
        return json_error("Accès non autorisé.", status=403)

    login(request, user)
    return JsonResponse({
        'success': True,
        'message': 'Connexion réussie.',
        'username': user.username,
    })


@csrf_exempt
@require_http_methods(["POST"])
@admin_required
def admin_logout(request):
    """
    POST /api/admin/logout/
    Déconnexion de l'administrateur.
    """
    logout(request)
    return JsonResponse({
        'success': True,
        'message': 'Déconnexion réussie.',
    })


@require_http_methods(["GET"])
def admin_check(request):
    """
    GET /api/admin/check/
    Vérifie si la session admin est active.
    """
    if request.user.is_authenticated and request.user.is_staff:
        return JsonResponse({
            'authenticated': True,
            'username': request.user.username,
        })
    return JsonResponse({'authenticated': False})


@csrf_exempt
@require_http_methods(["POST"])
@admin_required
def admin_change_password(request):
    """
    POST /api/admin/change-password/
    Change le mot de passe de l'administrateur connecté.
    Attend : { "currentPassword": "...", "newPassword": "..." }
    """
    data, error = parse_json_body(request)
    if error:
        return error

    current_password = data.get('currentPassword', '')
    new_password = data.get('newPassword', '')

    if not current_password or not new_password:
        return json_error("Les mots de passe actuel et nouveau sont requis.")

    # Vérifier le mot de passe actuel
    if not request.user.check_password(current_password):
        return json_error("Mot de passe actuel incorrect.", status=401)

    # Mettre à jour le mot de passe
    request.user.set_password(new_password)
    request.user.save()

    # Reconnecter l'utilisateur pour mettre à jour la session
    login(request, request.user)

    return JsonResponse({
        'success': True,
        'message': 'Mot de passe modifié avec succès.',
    })


@csrf_exempt
@require_http_methods(["GET", "PUT"])
@admin_required
def admin_me(request):
    """
    GET  /api/admin/me/  → Récupère les infos de l'utilisateur connecté
    PUT  /api/admin/me/  → Met à jour les infos de l'utilisateur connecté
    """
    if request.method == 'GET':
        return JsonResponse({
            'username': request.user.username,
            'firstName': request.user.first_name,
            'lastName': request.user.last_name,
            'email': request.user.email,
            'isSuperuser': request.user.is_superuser,
        })

    # PUT
    data, error = parse_json_body(request)
    if error:
        return error

    request.user.first_name = data.get('firstName', request.user.first_name)
    request.user.last_name = data.get('lastName', request.user.last_name)
    request.user.email = data.get('email', request.user.email)
    request.user.save()

    return JsonResponse({
        'username': request.user.username,
        'firstName': request.user.first_name,
        'lastName': request.user.last_name,
        'email': request.user.email,
    })


# ══════════════════════════════════════════════
# ENDPOINTS GUESTS (invités)
# ══════════════════════════════════════════════

@csrf_exempt
@require_http_methods(["GET", "POST"])
@admin_required
def guests_list_create(request):
    """
    GET  /api/guests/  → Liste tous les invités (admin requis)
    POST /api/guests/  → Ajoute un nouvel invité (admin requis)
    """
    if request.method == 'GET':
        guests = Guest.objects.all()
        return JsonResponse([g.to_dict() for g in guests], safe=False)

    # POST — Création d'un nouvel invité
    data, error = parse_json_body(request)
    if error:
        return error

    # Champs obligatoires
    first_name = data.get('firstName', '').strip()
    last_name = data.get('lastName', '').strip()
    phone = data.get('phone', '').strip()

    if not first_name or not last_name or not phone:
        return json_error("Les champs firstName, lastName et phone sont obligatoires.")

    # Créer l'invité avec les champs optionnels
    guest = Guest.objects.create(
        first_name=first_name,
        last_name=last_name,
        email=data.get('email', ''),
        phone=phone,
        plus_one=data.get('plusOne', False),
        plus_one_name=data.get('plusOneName', ''),
        number_of_guests=data.get('numberOfGuests', 1),
        dietary_restrictions=data.get('dietaryRestrictions', ''),
    )

    return JsonResponse(guest.to_dict(), status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
@admin_required
def guest_delete(request, guest_id):
    """
    DELETE /api/guests/<id>/
    Supprime un invité par son ID (admin requis).
    """
    try:
        guest = Guest.objects.get(pk=guest_id)
    except Guest.DoesNotExist:
        return json_error("Invité non trouvé.", status=404)

    guest.delete()
    return JsonResponse({
        'success': True,
        'message': 'Invité supprimé avec succès.',
    })


@require_http_methods(["GET"])
def guest_by_token(request, token):
    """
    GET /api/guests/by-token/<token>/
    Récupère un invité par son token d'invitation (pas d'auth requise).
    Utilisé par la page publique d'invitation.
    """
    try:
        guest = Guest.objects.get(token=token)
    except Guest.DoesNotExist:
        return json_error("Invitation non trouvée.", status=404)

    # Inclure aussi les informations du mariage pour la page d'invitation
    wedding_info = get_wedding_info()
    return JsonResponse({
        'guest': guest.to_dict(),
        'weddingInfo': wedding_info.to_dict() if wedding_info else {},
    })


# ══════════════════════════════════════════════
# ENDPOINT RSVP
# ══════════════════════════════════════════════

@csrf_exempt
@require_http_methods(["POST"])
def rsvp_submit(request, token):
    """
    POST /api/rsvp/<token>/
    Soumet la réponse RSVP d'un invité.
    Attend : {
        "rsvpStatus": "confirmed" | "declined",
        "rsvpMessage": "...",
        "numberOfGuests": 2,
        "plusOneName": "...",
        "dietaryRestrictions": "..."
    }
    """
    try:
        guest = Guest.objects.get(token=token)
    except Guest.DoesNotExist:
        return json_error("Invitation non trouvée.", status=404)

    data, error = parse_json_body(request)
    if error:
        return error

    # Statut RSVP obligatoire
    rsvp_status = data.get('rsvpStatus', '')
    if rsvp_status not in ('confirmed', 'declined'):
        return json_error("Le statut RSVP doit être 'confirmed' ou 'declined'.")

    # Mettre à jour les champs RSVP
    guest.rsvp_status = rsvp_status
    guest.rsvp_date = timezone.now()
    guest.rsvp_message = data.get('rsvpMessage', guest.rsvp_message)

    # Champs supplémentaires si confirmé
    if rsvp_status == 'confirmed':
        if 'numberOfGuests' in data:
            guest.number_of_guests = data['numberOfGuests']
        if 'plusOneName' in data:
            guest.plus_one_name = data['plusOneName']
        if 'dietaryRestrictions' in data:
            guest.dietary_restrictions = data['dietaryRestrictions']

    guest.save()

    return JsonResponse({
        'success': True,
        'message': 'Réponse RSVP enregistrée avec succès.',
        'guest': guest.to_dict(),
    })


# ══════════════════════════════════════════════
# ENDPOINTS WEDDING INFO
# ══════════════════════════════════════════════

@csrf_exempt
@require_http_methods(["GET", "PUT"])
def wedding_info_view(request):
    """
    GET /api/wedding-info/  → Récupère les informations du mariage (public)
    PUT /api/wedding-info/  → Met à jour les informations du mariage (admin requis)
    """
    if request.method == 'GET':
        info = get_wedding_info()
        if info:
            return JsonResponse(info.to_dict())
        return JsonResponse({
            'groomName': '', 'brideName': '', 'date': '', 'time': '',
            'venueName': '', 'venueAddress': '', 'receptionTime': '',
            'receptionVenue': '', 'receptionAddress': '', 'dressCode': '', 'rsvpDeadline': '',
            'lang': 'fr', 'card2Text': '', 'card2TextEn': '', 'coupleImage': '',
        })

    # PUT — Vérifier l'authentification admin
    if not request.user.is_authenticated or not request.user.is_staff:
        return json_error("Authentification requise.", status=401)

    data, error = parse_json_body(request)
    if error:
        return error

    info = get_wedding_info()
    if not info:
        info = WeddingInfo.objects.create(pk=1)

    field_mapping = {
        'groomName': 'groom_name',
        'brideName': 'bride_name',
        'date': 'date',
        'time': 'time',
        'venueName': 'venue_name',
        'venueAddress': 'venue_address',
        'receptionTime': 'reception_time',
        'receptionVenue': 'reception_venue',
        'receptionAddress': 'reception_address',
        'dressCode': 'dress_code',
        'rsvpDeadline': 'rsvp_deadline',
        'lang': 'lang',
        'card2Text': 'card2_text',
        'card2TextEn': 'card2_text_en',
        'coupleImage': 'couple_image',
    }

    for camel_key, snake_key in field_mapping.items():
        if camel_key in data:
            setattr(info, snake_key, data[camel_key])

    info.save()

    return JsonResponse(info.to_dict())


# ══════════════════════════════════════════════
# ENDPOINTS USERS (gestion des utilisateurs admin)
# ══════════════════════════════════════════════

@csrf_exempt
@require_http_methods(["GET", "POST"])
@admin_required
def users_list_create(request):
    """
    GET  /api/users/  → Liste tous les utilisateurs staff (admin requis)
    POST /api/users/  → Crée un nouvel utilisateur staff (admin requis)
    """
    if request.method == 'GET':
        users = User.objects.filter(is_staff=True).order_by('username')
        return JsonResponse([
            {
                'id': u.id,
                'username': u.username,
                'firstName': u.first_name,
                'lastName': u.last_name,
                'email': u.email,
                'dateJoined': u.date_joined.isoformat(),
                'isSuperuser': u.is_superuser,
            }
            for u in users
        ], safe=False)

    # POST — Création d'un nouvel utilisateur staff
    data, error = parse_json_body(request)
    if error:
        return error

    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()
    first_name = data.get('firstName', '').strip()
    last_name = data.get('lastName', '').strip()
    is_superuser = data.get('isSuperuser', False)

    if not username or not password:
        return json_error("Le nom d'utilisateur et le mot de passe sont obligatoires.")

    if User.objects.filter(username=username).exists():
        return json_error("Ce nom d'utilisateur existe déjà.")

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_staff=True,
        is_superuser=is_superuser,
    )

    return JsonResponse({
        'id': user.id,
        'username': user.username,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'email': user.email,
        'dateJoined': user.date_joined.isoformat(),
        'isSuperuser': user.is_superuser,
    }, status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
@admin_required
def user_delete(request, user_id):
    """
    DELETE /api/users/<id>/
    Supprime un utilisateur staff par son ID (admin requis).
    Empêche la suppression de son propre compte.
    """
    if request.user.id == user_id:
        return json_error("Vous ne pouvez pas supprimer votre propre compte.", status=400)

    try:
        user = User.objects.get(pk=user_id, is_staff=True)
    except User.DoesNotExist:
        return json_error("Utilisateur non trouvé.", status=404)

    user.delete()
    return JsonResponse({
        'success': True,
        'message': 'Utilisateur supprimé avec succès.',
    })
