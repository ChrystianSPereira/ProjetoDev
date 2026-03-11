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


def test_document_lifecycle_obsoletes_previous_active(client: TestClient, seeded_db: dict):
    first = _create_and_approve_version(
        client,
        code="DOC-001",
        title="Documento Base",
        scope="LOCAL",
        sector_id=seeded_db["sector_a"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/doc-v1.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_a"].email,
        coordinator_email=seeded_db["coordinator_a"].email,
    )
    assert first["version_number"] == 1
    assert first["status"] == "ACTIVE"

    second = _create_and_approve_version(
        client,
        code="DOC-001",
        title="Documento Base v2",
        scope="LOCAL",
        sector_id=seeded_db["sector_a"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/doc-v2.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_a"].email,
        coordinator_email=seeded_db["coordinator_a"].email,
    )

    assert second["version_number"] == 2
    assert second["status"] == "ACTIVE"

    author_headers = login_headers(client, seeded_db["author_a"].email)
    versions_resp = client.get(
        f"/documents/{second['document_id']}/versions",
        headers=author_headers,
    )
    assert versions_resp.status_code == 200, versions_resp.text

    versions = versions_resp.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[0]["status"] == "ACTIVE"
    assert versions[1]["version_number"] == 1
    assert versions[1]["status"] == "OBSOLETE"


def test_document_permissions_enforced(client: TestClient, seeded_db: dict):
    reader_headers = login_headers(client, seeded_db["reader_b"].email)

    create_resp = client.post(
        "/documents/drafts",
        json={
            "code": "DOC-BLOCK",
            "title": "Bloqueado",
            "scope": "LOCAL",
            "sector_id": seeded_db["sector_b"].id,
            "document_type_id": seeded_db["doc_type"].id,
            "expiration_date": seeded_db["default_expiration"],
            "file_uri": "s3://bucket/doc.pdf",
        },
        headers=reader_headers,
    )
    assert create_resp.status_code == 403

    _create_and_approve_version(
        client,
        code="DOC-SECTOR-A",
        title="Doc setor A",
        scope="LOCAL",
        sector_id=seeded_db["sector_a"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/doc-a-v1.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_a"].email,
        coordinator_email=seeded_db["coordinator_a"].email,
    )

    author_headers = login_headers(client, seeded_db["author_a"].email)
    new_draft_resp = client.post(
        "/documents/drafts",
        json={
            "code": "DOC-SECTOR-A",
            "title": "Doc setor A v2",
            "scope": "LOCAL",
            "sector_id": seeded_db["sector_a"].id,
            "document_type_id": seeded_db["doc_type"].id,
            "expiration_date": seeded_db["default_expiration"],
            "file_uri": "s3://bucket/doc-a-v2.pdf",
        },
        headers=author_headers,
    )
    assert new_draft_resp.status_code == 201

    version_id = new_draft_resp.json()["id"]
    submit_resp = client.post(f"/documents/{version_id}/submit", headers=author_headers)
    assert submit_resp.status_code == 200

    coord_other_sector_headers = login_headers(client, seeded_db["coordinator_b"].email)
    approve_resp = client.post(
        f"/documents/{version_id}/approve",
        headers=coord_other_sector_headers,
    )
    assert approve_resp.status_code == 403


def test_search_returns_only_active_and_visible_documents(client: TestClient, seeded_db: dict):
    _create_and_approve_version(
        client,
        code="CORP-001",
        title="Corporate",
        scope="CORPORATE",
        sector_id=seeded_db["sector_a"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/corp-v1.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_a"].email,
        coordinator_email=seeded_db["coordinator_a"].email,
    )

    _create_and_approve_version(
        client,
        code="LOCAL-A-001",
        title="Local A",
        scope="LOCAL",
        sector_id=seeded_db["sector_a"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/local-a-v1.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_a"].email,
        coordinator_email=seeded_db["coordinator_a"].email,
    )

    _create_and_approve_version(
        client,
        code="LOCAL-B-001",
        title="Local B",
        scope="LOCAL",
        sector_id=seeded_db["sector_b"].id,
        document_type_id=seeded_db["doc_type"].id,
        file_uri="s3://bucket/local-b-v1.pdf",
        expiration_date=seeded_db["default_expiration"],
        author_email=seeded_db["author_b"].email,
        coordinator_email=seeded_db["coordinator_b"].email,
    )

    reader_headers = login_headers(client, seeded_db["reader_b"].email)
    response = client.get("/documents/search", headers=reader_headers)

    assert response.status_code == 200, response.text
    payload = response.json()
    codes = {item["code"] for item in payload["items"]}

    assert "CORP-001" in codes
    assert "LOCAL-B-001" in codes
    assert "LOCAL-A-001" not in codes

