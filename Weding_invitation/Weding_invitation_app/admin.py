"""
Configuration de l'interface d'administration Django
pour les modèles Guest et WeddingInfo.
"""

from django.contrib import admin
from .models import Guest, WeddingInfo


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    """Administration des invités."""
    list_display = ('first_name', 'last_name', 'email', 'rsvp_status', 'plus_one', 'created_at')
    list_filter = ('rsvp_status', 'plus_one')
    search_fields = ('first_name', 'last_name', 'email')
    readonly_fields = ('token', 'created_at')


@admin.register(WeddingInfo)
class WeddingInfoAdmin(admin.ModelAdmin):
    """Administration des informations du mariage."""
    list_display = ('groom_name', 'bride_name', 'date', 'venue_name')
