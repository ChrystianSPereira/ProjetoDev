from fastapi.testclient import TestClient

from conftest import login_headers


def _create_and_approve_version(
    client: TestClient,
    *,
    code: str,
    title: str,
    scope: str,
    sector_id: int,
    document_type_id: int,
    file_uri: str,
    expiration_date: str,
    author_email: str,
    coordinator_email: str,
) -> dict:
    author_headers = login_headers(client, author_email)
    coordinator_headers = login_headers(client, coordinator_email)

    draft_resp = client.post(
        "/documents/drafts",
        json={
            "code": code,
            "title": title,
            "scope": scope,
            "sector_id": sector_id,
            "document_type_id": document_type_id,
            "expiration_date": expiration_date,
            "file_uri": file_uri,
        },
        headers=author_headers,
    )
    assert draft_resp.status_code == 201, draft_resp.text
    draft = draft_resp.json()

    submit_resp = client.post(
        f"/documents/{draft['id']}/submit",
        headers=author_headers,
    )
    assert submit_resp.status_code == 200, submit_resp.text

    approve_resp = client.post(
        f"/documents/{draft['id']}/approve",
        headers=coordinator_headers,
    )
    assert approve_resp.status_code == 200, approve_resp.text
    return approve_resp.json()


def test_audit_only_coordinator_can_access_logs(client: TestClient, seeded_db: dict):
    reader_headers = login_headers(client, seeded_db["reader_b"].email)

    response = client.get("/audit/logs", headers=reader_headers)
    assert response.status_code == 403
    assert response.json()["message"] == "Somente coordenador/admin pode consultar auditoria."


def test_audit_logs_visibility_by_scope_and_sector(client: TestClient, seeded_db: dict):
    corp = _create_and_approve_version(
        client,
        code="AUD-CORP-001",
        title="Audit Corp",
        scope="CORPORATE",
        sector_id=seeded_db["sector_a"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/aud-corp.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_a"].email,
        coordinator_email=seeded_db["coordinator_a"].email,
    )

    _create_and_approve_version(
        client,
        code="AUD-LOCAL-A-001",
        title="Audit Local A",
        scope="LOCAL",
        sector_id=seeded_db["sector_a"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/aud-local-a.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_a"].email,
        coordinator_email=seeded_db["coordinator_a"].email,
    )

    _create_and_approve_version(
        client,
        code="AUD-LOCAL-B-001",
        title="Audit Local B",
        scope="LOCAL",
        sector_id=seeded_db["sector_b"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/aud-local-b.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_b"].email,
        coordinator_email=seeded_db["coordinator_b"].email,
    )

    coord_b_headers = login_headers(client, seeded_db["coordinator_b"].email)
    response = client.get("/audit/logs?limit=100", headers=coord_b_headers)

    assert response.status_code == 200, response.text
    items = response.json()["items"]

    codes = {item["document_code"] for item in items}
    assert "AUD-CORP-001" in codes
    assert "AUD-LOCAL-B-001" in codes
    assert "AUD-LOCAL-A-001" not in codes

    filter_response = client.get(
        f"/audit/logs?document_id={corp['document_id']}&event_type=APPROVED&limit=20",
        headers=coord_b_headers,
    )
    assert filter_response.status_code == 200, filter_response.text
    filtered = filter_response.json()["items"]
    assert len(filtered) >= 1
    assert all(item["event_type"] == "APPROVED" for item in filtered)
    assert all(item["document_id"] == corp["document_id"] for item in filtered)


def test_audit_rejects_invalid_period(client: TestClient, seeded_db: dict):
    coord_headers = login_headers(client, seeded_db["coordinator_a"].email)

    response = client.get(
        "/audit/logs?start_at=2030-01-02T00:00:00Z&end_at=2030-01-01T00:00:00Z",
        headers=coord_headers,
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Parametro end_at deve ser maior ou igual a start_at."

