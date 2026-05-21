"""
Configuration des URLs de l'application d'invitation de mariage.
Toutes les routes API sont préfixées par /api/ (défini dans le urls.py du projet).
"""

from django.urls import path
from . import api_views

urlpatterns = [
    # ── Authentification admin ──
    path('admin/login/', api_views.admin_login, name='admin-login'),
    path('admin/logout/', api_views.admin_logout, name='admin-logout'),
    path('admin/check/', api_views.admin_check, name='admin-check'),
    path('admin/change-password/', api_views.admin_change_password, name='admin-change-password'),
    path('admin/me/', api_views.admin_me, name='admin-me'),

    # ── Gestion des invités ──
    path('guests/', api_views.guests_list_create, name='guests-list-create'),
    path('guests/<int:guest_id>/', api_views.guest_delete, name='guest-delete'),
    path('guests/by-token/<str:token>/', api_views.guest_by_token, name='guest-by-token'),

    # ── RSVP ──
    path('rsvp/<str:token>/', api_views.rsvp_submit, name='rsvp-submit'),

    # ── Informations du mariage ──
    path('wedding-info/', api_views.wedding_info_view, name='wedding-info'),
    path('wedding-info/upload/', api_views.wedding_info_upload, name='wedding-info-upload'),

    # ── Gestion des utilisateurs ──
    path('users/', api_views.users_list_create, name='users-list-create'),
    path('users/<int:user_id>/', api_views.user_delete, name='user-delete'),
]
