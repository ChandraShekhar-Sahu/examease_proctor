from .views import index
from django.urls import path

urlpatterns = [
    path('', index),
    path('login', index ),
    path('register', index),
    path('profile',index),
    path('create-exam',index),
    path('dashboard',index),
    path('takeexam/:userID/:examID',index),
    path('notify',index),
    path('exams',index),
    path('aboutUs',index),
]