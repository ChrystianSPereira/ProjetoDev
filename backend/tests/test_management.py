from fastapi.testclient import TestClient

from conftest import login_headers


def test_management_coordinator_can_create_sector_and_doc_type(
    client: TestClient, seeded_db: dict
):
    coord_headers = login_headers(client, seeded_db["coordinator_a"].email)

    sector_resp = client.post(
        "/sectors",
        json={"name": "Qualidade"},
        headers=coord_headers,
    )
    assert sector_resp.status_code == 201, sector_resp.text
    assert sector_resp.json()["name"] == "Qualidade"

    doc_type_resp = client.post(
        "/document-types",
        json={"name": "IT"},
        headers=coord_headers,
    )
    assert doc_type_resp.status_code == 201, doc_type_resp.text
    assert doc_type_resp.json()["name"] == "IT"


def test_management_non_coordinator_cannot_create_sector(
    client: TestClient, seeded_db: dict
):
    author_headers = login_headers(client, seeded_db["author_a"].email)

    response = client.post(
        "/sectors",
        json={"name": "Nao Pode"},
        headers=author_headers,
    )

    assert response.status_code == 403
    assert response.json()["message"] == "Somente coordenador/admin pode realizar esta acao."


def test_management_coordinator_can_create_user_only_in_own_sector(
    client: TestClient, seeded_db: dict
):
    coord_headers = login_headers(client, seeded_db["coordinator_a"].email)

    ok_resp = client.post(
        "/users",
        json={
            "name": "Novo Autor",
            "email": "novo.autor@local.com",
            "password": "123456",
            "role": "AUTOR",
            "sector_id": seeded_db["sector_a"].id,
        },
        headers=coord_headers,
    )
    assert ok_resp.status_code == 201, ok_resp.text
    assert ok_resp.json()["sector_id"] == seeded_db["sector_a"].id

    forbidden_resp = client.post(
        "/users",
        json={
            "name": "Outro Setor",
            "email": "outro.setor@local.com",
            "password": "123456",
            "role": "AUTOR",
            "sector_id": seeded_db["sector_b"].id,
        },
        headers=coord_headers,
    )
    assert forbidden_resp.status_code == 403
    assert forbidden_resp.json()["message"] == "Coordenador so pode criar usuarios no proprio setor."


def test_management_list_users_is_restricted_to_coordinator_sector(
    client: TestClient, seeded_db: dict
):
    coord_headers = login_headers(client, seeded_db["coordinator_a"].email)

    response = client.get("/users", headers=coord_headers)
    assert response.status_code == 200, response.text

    payload = response.json()
    assert payload["total"] >= 2

    emails = {item["email"] for item in payload["items"]}
    assert seeded_db["coordinator_a"].email in emails
    assert seeded_db["author_a"].email in emails
    assert seeded_db["coordinator_b"].email not in emails
    assert seeded_db["author_b"].email not in emails
