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


def test_change_password_success(client: TestClient, seeded_db: dict):
    headers = login_headers(client, seeded_db["author_a"].email)

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json={
            "current_password": "123456",
            "new_password": "NovaSenha@123",
            "confirm_new_password": "NovaSenha@123",
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Senha atualizada com sucesso."

    relogin = client.post(
        "/auth/login",
        data={"username": seeded_db["author_a"].email, "password": "NovaSenha@123"},
    )
    assert relogin.status_code == 200


def test_change_password_rejects_invalid_current_password(client: TestClient, seeded_db: dict):
    headers = login_headers(client, seeded_db["author_a"].email)

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json={
            "current_password": "errada",
            "new_password": "NovaSenha@123",
            "confirm_new_password": "NovaSenha@123",
        },
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Senha atual invalida."


def test_change_password_rejects_weak_password(client: TestClient, seeded_db: dict):
    headers = login_headers(client, seeded_db["author_a"].email)

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json={
            "current_password": "123456",
            "new_password": "abc12345",
            "confirm_new_password": "abc12345",
        },
    )

    assert response.status_code == 400
    assert (
        response.json()["message"]
        == "A nova senha deve conter ao menos 1 letra maiuscula, 1 minuscula, 1 numero e 1 caractere especial."
    )
