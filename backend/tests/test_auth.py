from fastapi.testclient import TestClient

from conftest import login_headers


def test_auth_login_and_me(client: TestClient, seeded_db: dict):
    me_headers = login_headers(client, seeded_db["author_a"].email)

    me_response = client.get("/auth/me", headers=me_headers)
    assert me_response.status_code == 200

    payload = me_response.json()
    assert payload["email"] == seeded_db["author_a"].email
    assert payload["role"] == "AUTOR"


def test_auth_login_invalid_credentials(client: TestClient, seeded_db: dict):
    response = client.post(
        "/auth/login",
        data={"username": seeded_db["author_a"].email, "password": "senha-errada"},
    )
    assert response.status_code == 401
    assert response.json()["message"] == "Credenciais invalidas."

