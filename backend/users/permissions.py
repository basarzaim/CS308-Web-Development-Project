from rest_framework import permissions


class IsSalesManager(permissions.BasePermission):
    """
    Custom permission to only allow Sales Managers to access.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'Sales Manager'


class IsProductManager(permissions.BasePermission):
    """
    Custom permission to only allow Product Managers to access.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'Product Manager'


class IsSupportAgent(permissions.BasePermission):
    """
    Custom permission to only allow Support Agents to access.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'Support Agent'


class IsSalesOrProductManager(permissions.BasePermission):
    """
    Custom permission to allow either Sales Managers or Product Managers to access.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.role == 'Sales Manager' or request.user.role == 'Product Manager'
        )
