from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from config.middleware import CorsMiddleware


class CorsMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(FRONTEND_ORIGIN="https://frontend.example")
    def test_adds_cors_headers_for_allowed_origin(self):
        middleware = CorsMiddleware(lambda request: HttpResponse("ok", status=200))
        request = self.factory.get(
            "/api/health", headers={"Origin": "https://frontend.example"}
        )

        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Access-Control-Allow-Origin"], "https://frontend.example"
        )
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")
        self.assertEqual(
            response["Access-Control-Allow-Headers"], "Content-Type, X-CSRFToken"
        )
        self.assertEqual(
            response["Access-Control-Allow-Methods"], "GET, POST, PATCH, OPTIONS"
        )
        self.assertEqual(response["Vary"], "Origin")

    @override_settings(FRONTEND_ORIGIN="https://frontend.example")
    def test_does_not_add_cors_headers_for_other_origin(self):
        middleware = CorsMiddleware(lambda request: HttpResponse("ok", status=200))
        request = self.factory.get(
            "/api/health", headers={"Origin": "https://other.example"}
        )

        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Access-Control-Allow-Origin", response)

    @override_settings(FRONTEND_ORIGIN="https://frontend.example")
    def test_options_request_short_circuits_response_and_adds_cors_headers(self):
        def get_response(request):
            return HttpResponse("should not be called", status=500)

        middleware = CorsMiddleware(get_response)
        request = self.factory.options(
            "/api/health", headers={"Origin": "https://frontend.example"}
        )

        response = middleware(request)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        self.assertEqual(
            response["Access-Control-Allow-Origin"], "https://frontend.example"
        )
