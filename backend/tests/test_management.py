from fastapi.testclient import TestClient

from conftest import login_headers


def test_management_admin_can_create_sector_and_doc_type(
    client: TestClient, seeded_db: dict
):
    admin_headers = login_headers(client, seeded_db["admin"].email)

    sector_resp = client.post(
        "/sectors",
        json={"name": "Qualidade"},
        headers=admin_headers,
    )
    assert sector_resp.status_code == 201, sector_resp.text
    assert sector_resp.json()["name"] == "Qualidade"

    doc_type_resp = client.post(
        "/document-types",
        json={"name": "IT"},
        headers=admin_headers,
    )
    assert doc_type_resp.status_code == 201, doc_type_resp.text
    assert doc_type_resp.json()["name"] == "IT"


def test_management_non_admin_cannot_create_sector(
    client: TestClient, seeded_db: dict
):
    coord_headers = login_headers(client, seeded_db["coordinator_a"].email)

    response = client.post(
        "/sectors",
        json={"name": "Nao Pode"},
        headers=coord_headers,
    )

    assert response.status_code == 403
    assert response.json()["message"] == "Somente administrador pode realizar esta acao."


def test_management_admin_can_create_user_in_any_sector(
    client: TestClient, seeded_db: dict
):
    admin_headers = login_headers(client, seeded_db["admin"].email)

    resp_a = client.post(
        "/users",
        json={
            "name": "Novo Autor A",
            "email": "novo.autor.a@local.com",
            "password": "123456",
            "role": "AUTOR",
            "sector_id": seeded_db["sector_a"].id,
        },
        headers=admin_headers,
    )
    assert resp_a.status_code == 201, resp_a.text
    assert resp_a.json()["sector_id"] == seeded_db["sector_a"].id

    resp_b = client.post(
        "/users",
        json={
            "name": "Novo Autor B",
            "email": "novo.autor.b@local.com",
            "password": "123456",
            "role": "AUTOR",
            "sector_id": seeded_db["sector_b"].id,
        },
        headers=admin_headers,
    )
    assert resp_b.status_code == 201, resp_b.text
    assert resp_b.json()["sector_id"] == seeded_db["sector_b"].id


def test_management_list_users_admin_scope_only(
    client: TestClient, seeded_db: dict
):
    admin_headers = login_headers(client, seeded_db["admin"].email)
    coord_headers = login_headers(client, seeded_db["coordinator_a"].email)

    admin_response = client.get("/users", headers=admin_headers)
    assert admin_response.status_code == 200, admin_response.text

    payload = admin_response.json()
    emails = {item["email"] for item in payload["items"]}
    assert seeded_db["coordinator_a"].email in emails
    assert seeded_db["author_a"].email in emails
    assert seeded_db["coordinator_b"].email in emails
    assert seeded_db["author_b"].email in emails

    coord_response = client.get("/users", headers=coord_headers)
    assert coord_response.status_code == 403
    assert coord_response.json()["message"] == "Somente administrador pode realizar esta acao."
