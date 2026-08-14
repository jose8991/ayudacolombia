from uuid import UUID

from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_request_id_is_returned_and_valid() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health/live")

    assert response.status_code == 200
    UUID(response.headers["X-Request-ID"])


async def test_valid_request_id_is_preserved() -> None:
    request_id = "7ed30afa-6a3f-4b74-97f1-c36c8f8bb4ea"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/health/live", headers={"X-Request-ID": request_id}
        )

    assert response.headers["X-Request-ID"] == request_id
