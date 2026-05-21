"""
Modèles de données pour l'application d'invitation de mariage.
Contient les modèles Guest (invité) et WeddingInfo (informations du mariage).
"""

import secrets
from django.db import models
from django.utils import timezone


def generate_token():
    """Génère un token unique pour l'invitation d'un invité."""
    return secrets.token_urlsafe(16)


class Guest(models.Model):
    """
    Modèle représentant un invité au mariage.
    Chaque invité possède un token unique pour accéder à son invitation.
    """

    RSVP_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmé'),
        ('declined', 'Décliné'),
    ]

    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    email = models.EmailField(blank=True, default='', verbose_name="Email")
    phone = models.CharField(max_length=20, verbose_name="Téléphone")
    token = models.CharField(
        max_length=50, unique=True, default=generate_token, verbose_name="Token d'invitation"
    )
    plus_one = models.BooleanField(default=False, verbose_name="Accompagnant autorisé")
    plus_one_name = models.CharField(
        max_length=200, blank=True, default='', verbose_name="Nom de l'accompagnant"
    )
    rsvp_status = models.CharField(
        max_length=10, choices=RSVP_STATUS_CHOICES, default='pending', verbose_name="Statut RSVP"
    )
    rsvp_date = models.DateTimeField(null=True, blank=True, verbose_name="Date de réponse")
    rsvp_message = models.TextField(blank=True, default='', verbose_name="Message RSVP")
    number_of_guests = models.PositiveIntegerField(default=1, verbose_name="Nombre d'invités")
    dietary_restrictions = models.TextField(
        blank=True, default='', verbose_name="Restrictions alimentaires"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")

    class Meta:
        ordering = ['last_name', 'first_name']
        verbose_name = "Invité"
        verbose_name_plural = "Invités"

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def to_dict(self):
        """
        Sérialise l'invité en dictionnaire avec des clés camelCase
        pour correspondre aux interfaces TypeScript du frontend.
        """
        return {
            'id': str(self.id),
            'firstName': self.first_name,
            'lastName': self.last_name,
            'email': self.email,
            'phone': self.phone or None,
            'token': self.token,
            'plusOne': self.plus_one,
            'plusOneName': self.plus_one_name or None,
            'rsvpStatus': self.rsvp_status,
            'rsvpDate': self.rsvp_date.isoformat() if self.rsvp_date else None,
            'rsvpMessage': self.rsvp_message or None,
            'numberOfGuests': self.number_of_guests,
            'dietaryRestrictions': self.dietary_restrictions or None,
            'createdAt': self.created_at.isoformat(),
        }


class WeddingInfo(models.Model):
    """
    Modèle singleton contenant les informations du mariage.
    Utilise pk=1 via get_or_create pour garantir une seule instance.
    """

    groom_name = models.CharField(max_length=100, verbose_name="Nom du marié")
    bride_name = models.CharField(max_length=100, verbose_name="Nom de la mariée")
    date = models.CharField(max_length=50, verbose_name="Date du mariage")
    time = models.CharField(max_length=20, verbose_name="Heure de la cérémonie")
    venue_name = models.CharField(max_length=200, verbose_name="Nom du lieu")
    venue_address = models.CharField(max_length=300, verbose_name="Adresse du lieu")
    reception_time = models.CharField(max_length=20, verbose_name="Heure de la réception")
    reception_venue = models.CharField(max_length=200, verbose_name="Lieu de la réception")
    reception_address = models.CharField(max_length=300, verbose_name="Adresse de la réception")
    dress_code = models.CharField(max_length=100, verbose_name="Code vestimentaire")
    rsvp_deadline = models.CharField(max_length=50, verbose_name="Date limite RSVP")
    lang = models.CharField(max_length=2, choices=[('fr', 'Français'), ('en', 'English')], default='fr', verbose_name="Langue")
    card2_text = models.TextField(blank=True, default='', verbose_name="Texte carte 2")

    class Meta:
        verbose_name = "Information du mariage"
        verbose_name_plural = "Informations du mariage"

    def __str__(self):
        return f"Mariage de {self.groom_name} & {self.bride_name}"

    def to_dict(self):
        """
        Sérialise les informations du mariage en dictionnaire avec des clés camelCase
        pour correspondre à l'interface TypeScript WeddingInfo du frontend.
        """
        return {
            'groomName': self.groom_name,
            'brideName': self.bride_name,
            'date': self.date,
            'time': self.time,
            'venueName': self.venue_name,
            'venueAddress': self.venue_address,
            'receptionTime': self.reception_time,
            'receptionVenue': self.reception_venue,
            'receptionAddress': self.reception_address,
            'dressCode': self.dress_code,
            'rsvpDeadline': self.rsvp_deadline,
            'lang': self.lang,
            'card2Text': self.card2_text,
        }
