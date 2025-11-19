from django.contrib import admin
from .models import Comment, Rating

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('customer', 'product', 'status', 'created_at')
    
    list_filter = ('status', 'created_at')

    search_fields = ('body', 'customer__username', 'product__name')

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('customer', 'product', 'score', 'created_at')
    list_filter = ('score',)