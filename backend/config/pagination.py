"""
Custom pagination classes for the API.
"""
from rest_framework.pagination import PageNumberPagination


class DynamicPageSizePagination(PageNumberPagination):
    """
    Pagination class that allows clients to set the page size via query parameter.

    Usage:
    - Default page size: 12 items
    - Client can override: ?page_size=8
    - Maximum allowed: 100 items per page
    - Query param for page size: page_size
    """
    page_size = 12  # Default page size
    page_size_query_param = 'page_size'  # Allow client to override via ?page_size=N
    max_page_size = 100  # Maximum limit to prevent abuse
