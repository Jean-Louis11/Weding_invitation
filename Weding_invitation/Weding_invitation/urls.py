"""
URL configuration for Weding_invitation project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from pathlib import Path
from django.conf import settings
from django.conf.urls.static import static
from django.templatetags.static import static as django_static

def index_view(request):
    index_path = Path(__file__).resolve().parent.parent / 'templates' / 'wedding-invitation-management-website' / 'dist' / 'index.html'
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()

    try:
        from Weding_invitation_app.models import WeddingInfo
        info = WeddingInfo.objects.get(pk=1)
        groom = info.groom_name
        bride = info.bride_name
        couple_image = ''
        if info.couple_image:
            couple_image = request.build_absolute_uri(info.couple_image.url)

        title = f"Mariage de {groom} & {bride}"
        description = f"Vous êtes invité(e) au mariage de {groom} & {bride}"

        og_tags = [
            f'<meta property="og:title" content="{title}" />',
            f'<meta property="og:description" content="{description}" />',
            f'<meta property="og:type" content="website" />',
            f'<meta name="twitter:card" content="summary_large_image" />',
            f'<meta name="twitter:title" content="{title}" />',
            f'<meta name="twitter:description" content="{description}" />',
        ]
        if couple_image:
            og_tags.append(f'<meta property="og:image" content="{couple_image}" />')
            og_tags.append(f'<meta name="twitter:image" content="{couple_image}" />')

        og_block = '\n    '.join(og_tags)

        content = content.replace(
            '<meta property="og:title" content="Mariage — Invitation" />',
            og_block
        )
        content = content.replace(
            '<meta property="og:description" content="Vous êtes invité(e) au mariage" />',
            ''
        )
        content = content.replace(
            '<meta property="og:image" content="" />',
            ''
        )
        content = content.replace(
            '<meta name="twitter:card" content="summary_large_image" />',
            ''
        )
        content = content.replace(
            '<meta name="twitter:title" content="Mariage — Invitation" />',
            ''
        )
        content = content.replace(
            '<meta name="twitter:description" content="Vous êtes invité(e) au mariage" />',
            ''
        )
        content = content.replace(
            '<meta name="twitter:image" content="" />',
            ''
        )
    except Exception:
        pass

    return HttpResponse(content, content_type='text/html')

urlpatterns = [
    path('', index_view, name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('Weding_invitation_app.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[1])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
