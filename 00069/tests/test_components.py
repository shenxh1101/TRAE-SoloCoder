import unittest
import time
import json
from app.transformer import Transformer
from app.rate_limit import RateLimiter


class TestTransformerRequest(unittest.TestCase):
    def setUp(self):
        self.transformer = Transformer()

    def test_add_headers(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {"Accept": "application/json"},
            "query_params": {},
            "body": {}
        }
        config = {
            "request": {
                "add_headers": {
                    "X-Custom": "value1",
                    "X-Another": "value2"
                }
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertEqual(result["headers"]["X-Custom"], "value1")
        self.assertEqual(result["headers"]["X-Another"], "value2")
        self.assertEqual(result["headers"]["Accept"], "application/json")

    def test_remove_headers(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {"Accept": "application/json", "X-Internal": "secret"},
            "query_params": {},
            "body": {}
        }
        config = {
            "request": {
                "remove_headers": ["X-Internal"]
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertNotIn("X-Internal", result["headers"])
        self.assertIn("Accept", result["headers"])

    def test_rename_headers(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {"X-Old-Name": "value"},
            "query_params": {},
            "body": {}
        }
        config = {
            "request": {
                "rename_headers": {"X-Old-Name": "X-New-Name"}
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertNotIn("X-Old-Name", result["headers"])
        self.assertEqual(result["headers"]["X-New-Name"], "value")

    def test_add_query_params(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {},
            "query_params": {"existing": "param"},
            "body": {}
        }
        config = {
            "request": {
                "add_query_params": {
                    "gateway_source": "api-gateway",
                    "trace_id": "abc123"
                }
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertEqual(result["query_params"]["gateway_source"], "api-gateway")
        self.assertEqual(result["query_params"]["trace_id"], "abc123")
        self.assertEqual(result["query_params"]["existing"], "param")

    def test_remove_query_params(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {},
            "query_params": {"debug": "true", "keep": "me"},
            "body": {}
        }
        config = {
            "request": {
                "remove_query_params": ["debug"]
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertNotIn("debug", result["query_params"])
        self.assertIn("keep", result["query_params"])

    def test_add_body_fields_flat(self):
        data = {
            "method": "POST",
            "path": "/api/test",
            "headers": {"Content-Type": "application/json"},
            "query_params": {},
            "body": {"name": "test"}
        }
        config = {
            "request": {
                "add_body_fields": {
                    "source": "gateway",
                    "version": "1.0"
                }
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertEqual(result["body"]["source"], "gateway")
        self.assertEqual(result["body"]["version"], "1.0")
        self.assertEqual(result["body"]["name"], "test")

    def test_add_body_fields_nested(self):
        data = {
            "method": "POST",
            "path": "/api/test",
            "headers": {},
            "query_params": {},
            "body": {"name": "test"}
        }
        config = {
            "request": {
                "add_body_fields": {
                    "metadata.gateway_version": "1.0.0",
                    "metadata.trace_source": "gateway"
                }
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertEqual(result["body"]["metadata"]["gateway_version"], "1.0.0")
        self.assertEqual(result["body"]["metadata"]["trace_source"], "gateway")

    def test_remove_body_fields(self):
        data = {
            "method": "POST",
            "path": "/api/test",
            "headers": {},
            "query_params": {},
            "body": {"name": "test", "internal_token": "secret", "debug": True}
        }
        config = {
            "request": {
                "remove_body_fields": ["internal_token", "debug"]
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertNotIn("internal_token", result["body"])
        self.assertNotIn("debug", result["body"])
        self.assertIn("name", result["body"])

    def test_rename_body_fields(self):
        data = {
            "method": "POST",
            "path": "/api/test",
            "headers": {},
            "query_params": {},
            "body": {"old_name": "value", "keep": "this"}
        }
        config = {
            "request": {
                "rename_body_fields": {"old_name": "new_name"}
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertNotIn("old_name", result["body"])
        self.assertEqual(result["body"]["new_name"], "value")
        self.assertEqual(result["body"]["keep"], "this")

    def test_rewrite_path(self):
        data = {
            "method": "GET",
            "path": "/api/user/v1/profile",
            "headers": {},
            "query_params": {},
            "body": {}
        }
        config = {
            "request": {
                "rewrite_path": {
                    "pattern": r"^/api/user/(v\d+)/",
                    "replacement": r"/$1/"
                }
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertEqual(result["path"], "/v1/profile")

    def test_rewrite_method(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {},
            "query_params": {},
            "body": {}
        }
        config = {
            "request": {
                "rewrite_method": "POST"
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertEqual(result["method"], "POST")

    def test_empty_transform_config(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {"Accept": "json"},
            "query_params": {"q": "1"},
            "body": {"key": "value"}
        }
        result = self.transformer.transform_request(data, {})
        self.assertEqual(result, data)

    def test_none_transform_config(self):
        data = {
            "method": "GET",
            "path": "/api/test",
            "headers": {},
            "query_params": {},
            "body": {}
        }
        result = self.transformer.transform_request(data, None)
        self.assertEqual(result, data)

    def test_non_dict_body_unchanged(self):
        data = {
            "method": "POST",
            "path": "/api/test",
            "headers": {"Content-Type": "text/plain"},
            "query_params": {},
            "body": "plain text body"
        }
        config = {
            "request": {
                "add_body_fields": {"new_field": "value"}
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertEqual(result["body"], "plain text body")

    def test_combined_request_transform(self):
        data = {
            "method": "GET",
            "path": "/api/user/v1/profile",
            "headers": {
                "Accept": "application/json",
                "X-Internal-Token": "secret"
            },
            "query_params": {"debug": "true", "q": "search"},
            "body": {
                "name": "test",
                "internal_token": "abc"
            }
        }
        config = {
            "request": {
                "add_headers": {"X-Gateway": "true"},
                "remove_headers": ["X-Internal-Token"],
                "add_query_params": {"source": "gateway"},
                "remove_query_params": ["debug"],
                "add_body_fields": {"metadata.version": "1.0"},
                "remove_body_fields": ["internal_token"],
                "rewrite_path": {
                    "pattern": r"^/api/user/(v\d+)/",
                    "replacement": r"/$1/"
                }
            }
        }
        result = self.transformer.transform_request(data, config)
        self.assertIn("X-Gateway", result["headers"])
        self.assertNotIn("X-Internal-Token", result["headers"])
        self.assertEqual(result["query_params"]["source"], "gateway")
        self.assertNotIn("debug", result["query_params"])
        self.assertEqual(result["body"]["metadata"]["version"], "1.0")
        self.assertNotIn("internal_token", result["body"])
        self.assertEqual(result["path"], "/v1/profile")


class TestTransformerResponse(unittest.TestCase):
    def setUp(self):
        self.transformer = Transformer()

    def test_add_response_headers(self):
        data = {"status_code": 200, "headers": {"Content-Type": "application/json"}, "body": {}}
        config = {"response": {"add_headers": {"X-Processed-By": "gateway"}}}
        result = self.transformer.transform_response(data, config)
        self.assertEqual(result["headers"]["X-Processed-By"], "gateway")

    def test_remove_response_headers(self):
        data = {"status_code": 200, "headers": {"Content-Type": "json", "X-Debug": "info"}, "body": {}}
        config = {"response": {"remove_headers": ["X-Debug"]}}
        result = self.transformer.transform_response(data, config)
        self.assertNotIn("X-Debug", result["headers"])

    def test_hide_sensitive_string_field(self):
        data = {
            "status_code": 200,
            "headers": {},
            "body": {"password": "mypassword123", "name": "user"}
        }
        config = {"response": {"hide_sensitive_fields": ["password"]}}
        result = self.transformer.transform_response(data, config)
        self.assertNotEqual(result["body"]["password"], "mypassword123")
        self.assertTrue("*" in result["body"]["password"])
        self.assertEqual(result["body"]["name"], "user")

    def test_hide_short_string_field(self):
        data = {"status_code": 200, "headers": {}, "body": {"token": "abc"}}
        config = {"response": {"hide_sensitive_fields": ["token"]}}
        result = self.transformer.transform_response(data, config)
        self.assertEqual(result["body"]["token"], "***")

    def test_hide_numeric_field(self):
        data = {"status_code": 200, "headers": {}, "body": {"ssn": 123456789}}
        config = {"response": {"hide_sensitive_fields": ["ssn"]}}
        result = self.transformer.transform_response(data, config)
        self.assertEqual(result["body"]["ssn"], "***")

    def test_hide_nested_field(self):
        data = {
            "status_code": 200,
            "headers": {},
            "body": {"user": {"password": "secret123", "email": "test@test.com"}}
        }
        config = {"response": {"hide_sensitive_fields": ["user.password"]}}
        result = self.transformer.transform_response(data, config)
        self.assertTrue("*" in result["body"]["user"]["password"])
        self.assertEqual(result["body"]["user"]["email"], "test@test.com")

    def test_add_response_body_fields(self):
        data = {"status_code": 200, "headers": {}, "body": {"name": "test"}}
        config = {"response": {"add_body_fields": {"gateway_meta.processed": True}}}
        result = self.transformer.transform_response(data, config)
        self.assertTrue(result["body"]["gateway_meta"]["processed"])

    def test_remove_response_body_fields(self):
        data = {"status_code": 200, "headers": {}, "body": {"name": "test", "internal_debug": True}}
        config = {"response": {"remove_body_fields": ["internal_debug"]}}
        result = self.transformer.transform_response(data, config)
        self.assertNotIn("internal_debug", result["body"])
        self.assertIn("name", result["body"])

    def test_multiple_sensitive_fields(self):
        data = {
            "status_code": 200,
            "headers": {},
            "body": {
                "username": "admin",
                "password": "pass1234",
                "token": "bearer-token-here",
                "secret": "mysecret"
            }
        }
        config = {"response": {"hide_sensitive_fields": ["password", "token", "secret"]}}
        result = self.transformer.transform_response(data, config)
        self.assertEqual(result["body"]["username"], "admin")
        self.assertTrue("*" in result["body"]["password"])
        self.assertTrue("*" in result["body"]["token"])
        self.assertTrue("*" in result["body"]["secret"])


class TestTokenBucket(unittest.TestCase):
    def setUp(self):
        self.limiter = RateLimiter()

    def test_allow_within_capacity(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 10, "rate": 1}
        for i in range(10):
            allowed, info = self.limiter._token_bucket("test_route:127.0.0.1", config)
            self.assertTrue(allowed, f"Request {i+1} should be allowed")

    def test_reject_over_capacity(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 5, "rate": 1}
        for i in range(5):
            self.limiter._token_bucket("test_route2:127.0.0.1", config)
        allowed, info = self.limiter._token_bucket("test_route2:127.0.0.1", config)
        self.assertFalse(allowed)

    def test_token_refill(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 5, "rate": 100}
        for i in range(5):
            self.limiter._token_bucket("test_route3:127.0.0.1", config)
        allowed, _ = self.limiter._token_bucket("test_route3:127.0.0.1", config)
        self.assertFalse(allowed)
        time.sleep(0.05)
        allowed, info = self.limiter._token_bucket("test_route3:127.0.0.1", config)
        self.assertTrue(allowed)

    def test_different_routes_independent(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 2, "rate": 1}
        for i in range(2):
            self.limiter._token_bucket("route_a:127.0.0.1", config)
        allowed_a, _ = self.limiter._token_bucket("route_a:127.0.0.1", config)
        allowed_b, _ = self.limiter._token_bucket("route_b:127.0.0.1", config)
        self.assertFalse(allowed_a)
        self.assertTrue(allowed_b)

    def test_different_ips_independent(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 2, "rate": 1}
        for i in range(2):
            self.limiter._token_bucket("route_c:10.0.0.1", config)
        allowed_1, _ = self.limiter._token_bucket("route_c:10.0.0.1", config)
        allowed_2, _ = self.limiter._token_bucket("route_c:10.0.0.2", config)
        self.assertFalse(allowed_1)
        self.assertTrue(allowed_2)


class TestLeakyBucket(unittest.TestCase):
    def setUp(self):
        self.limiter = RateLimiter()

    def test_allow_within_capacity(self):
        config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 10, "rate": 1}
        for i in range(10):
            allowed, info = self.limiter._leaky_bucket("leaky_route1:127.0.0.1", config)
            self.assertTrue(allowed, f"Request {i+1} should be allowed")

    def test_reject_over_capacity(self):
        config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 5, "rate": 1}
        for i in range(5):
            self.limiter._leaky_bucket("leaky_route2:127.0.0.1", config)
        allowed, info = self.limiter._leaky_bucket("leaky_route2:127.0.0.1", config)
        self.assertFalse(allowed)

    def test_queue_drain(self):
        config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 3, "rate": 1000}
        for i in range(3):
            self.limiter._leaky_bucket("leaky_route3:127.0.0.1", config)
        allowed, _ = self.limiter._leaky_bucket("leaky_route3:127.0.0.1", config)
        self.assertFalse(allowed)
        time.sleep(0.01)
        allowed, info = self.limiter._leaky_bucket("leaky_route3:127.0.0.1", config)
        self.assertTrue(allowed)

    def test_queue_size_info(self):
        config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 10, "rate": 1}
        self.limiter._leaky_bucket("leaky_route4:127.0.0.1", config)
        self.limiter._leaky_bucket("leaky_route4:127.0.0.1", config)
        allowed, info = self.limiter._leaky_bucket("leaky_route4:127.0.0.1", config)
        self.assertTrue(allowed)
        self.assertEqual(info["queue_size"], 3)
        self.assertIn("wait_time", info)

    def test_different_routes_independent(self):
        config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 2, "rate": 1}
        for i in range(2):
            self.limiter._leaky_bucket("lr_a:127.0.0.1", config)
        allowed_a, _ = self.limiter._leaky_bucket("lr_a:127.0.0.1", config)
        allowed_b, _ = self.limiter._leaky_bucket("lr_b:127.0.0.1", config)
        self.assertFalse(allowed_a)
        self.assertTrue(allowed_b)

    def test_different_ips_independent(self):
        config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 2, "rate": 1}
        for i in range(2):
            self.limiter._leaky_bucket("lr_c:10.0.0.1", config)
        allowed_1, _ = self.limiter._leaky_bucket("lr_c:10.0.0.1", config)
        allowed_2, _ = self.limiter._leaky_bucket("lr_c:10.0.0.2", config)
        self.assertFalse(allowed_1)
        self.assertTrue(allowed_2)

    def test_wait_time_calculation(self):
        config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 3, "rate": 10}
        for i in range(3):
            self.limiter._leaky_bucket("leaky_wait:127.0.0.1", config)
        allowed, info = self.limiter._leaky_bucket("leaky_wait:127.0.0.1", config)
        self.assertFalse(allowed)
        self.assertGreater(info["wait_time"], 0)


class TestRateLimiterPerRoute(unittest.TestCase):
    def setUp(self):
        self.limiter = RateLimiter()

    def test_token_bucket_per_route_config(self):
        tb_config = {"enabled": True, "algorithm": "token_bucket", "capacity": 3, "rate": 1}
        for i in range(3):
            allowed, _ = self.limiter._token_bucket("per_route_tb:127.0.0.1", tb_config)
            self.assertTrue(allowed)
        allowed, _ = self.limiter._token_bucket("per_route_tb:127.0.0.1", tb_config)
        self.assertFalse(allowed)

    def test_leaky_bucket_per_route_config(self):
        lb_config = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 3, "rate": 1}
        for i in range(3):
            allowed, _ = self.limiter._leaky_bucket("per_route_lb:127.0.0.1", lb_config)
            self.assertTrue(allowed)
        allowed, _ = self.limiter._leaky_bucket("per_route_lb:127.0.0.1", lb_config)
        self.assertFalse(allowed)

    def test_reset_route(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 2, "rate": 1}
        for i in range(2):
            self.limiter._token_bucket("reset_route:127.0.0.1", config)
        allowed, _ = self.limiter._token_bucket("reset_route:127.0.0.1", config)
        self.assertFalse(allowed)
        self.limiter.reset(route_prefix="reset_route")
        allowed, _ = self.limiter._token_bucket("reset_route:127.0.0.1", config)
        self.assertTrue(allowed)

    def test_reset_all(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 2, "rate": 1}
        for i in range(2):
            self.limiter._token_bucket("reset_all1:127.0.0.1", config)
            self.limiter._token_bucket("reset_all2:127.0.0.1", config)
        self.limiter.reset()
        allowed1, _ = self.limiter._token_bucket("reset_all1:127.0.0.1", config)
        allowed2, _ = self.limiter._token_bucket("reset_all2:127.0.0.1", config)
        self.assertTrue(allowed1)
        self.assertTrue(allowed2)

    def test_get_stats(self):
        config_tb = {"enabled": True, "algorithm": "token_bucket", "capacity": 10, "rate": 1}
        config_lb = {"enabled": True, "algorithm": "leaky_bucket", "capacity": 10, "rate": 1}
        self.limiter._token_bucket("stats_tb:127.0.0.1", config_tb)
        self.limiter._leaky_bucket("stats_lb:127.0.0.1", config_lb)
        stats = self.limiter.get_stats()
        self.assertIn("stats_tb", stats)
        self.assertIn("stats_lb", stats)
        self.assertEqual(stats["stats_tb"]["127.0.0.1"]["algorithm"], "token_bucket")
        self.assertEqual(stats["stats_lb"]["127.0.0.1"]["algorithm"], "leaky_bucket")

    def test_get_stats_filter_by_route(self):
        config = {"enabled": True, "algorithm": "token_bucket", "capacity": 10, "rate": 1}
        self.limiter._token_bucket("filter_a:127.0.0.1", config)
        self.limiter._token_bucket("filter_b:127.0.0.1", config)
        stats = self.limiter.get_stats(route_prefix="filter_a")
        self.assertIn("filter_a", stats)
        self.assertNotIn("filter_b", stats)


if __name__ == "__main__":
    unittest.main()
