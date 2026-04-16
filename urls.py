from .views import index
from django.urls import path
from django.views.generic import TemplateView
from django.urls import re_path
 
urlpatterns = [
    path('', index),
    path('login', index ),
    path('register', index),
    path('profile',index),
    path('create-exam',index),
    path('dashboard',index),
    path('takeexam/<str:examID>',index),
    path('notify',index),
    path('exams',index),
    path('aboutUs',index),
    path('favicon.ico', index),
    path('pre-exam',index),
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]