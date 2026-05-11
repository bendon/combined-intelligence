"""Qdrant client helpers — embedding generation + semantic search."""
import hashlib
import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue,
)
from app.config import get_settings

settings = get_settings()

COLLECTION = "report_chunks"
VECTOR_DIM = 768  # nomic-embed-text or all-minilm-l6-v2 output dim

_client: QdrantClient | None = None


def get_qdrant() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
        _ensure_collection()
    return _client


def _ensure_collection() -> None:
    client = _client
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )


def _embed(text: str) -> list[float]:
    """Call Ollama's embedding endpoint (nomic-embed-text)."""
    resp = httpx.post(
        f"{settings.ollama_base_url}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


def upsert_chunks(report_id: str, chunks: list[str]) -> None:
    client = get_qdrant()
    points = []
    for i, chunk in enumerate(chunks):
        uid = int(hashlib.md5(f"{report_id}:{i}".encode()).hexdigest(), 16) % (2**63)
        vector = _embed(chunk)
        points.append(PointStruct(
            id=uid,
            vector=vector,
            payload={"report_id": report_id, "chunk_index": i, "text": chunk},
        ))

    # Upsert in batches of 50
    for i in range(0, len(points), 50):
        client.upsert(collection_name=COLLECTION, points=points[i:i + 50])


def semantic_search(query: str, limit: int = 5, report_id: str | None = None) -> list[dict]:
    client = get_qdrant()
    vector = _embed(query)

    filt = None
    if report_id:
        filt = Filter(must=[FieldCondition(key="report_id", match=MatchValue(value=report_id))])

    hits = client.search(
        collection_name=COLLECTION,
        query_vector=vector,
        limit=limit,
        query_filter=filt,
        with_payload=True,
    )
    return [
        {"score": h.score, "report_id": h.payload["report_id"], "text": h.payload["text"]}
        for h in hits
    ]


def delete_report_chunks(report_id: str) -> None:
    client = get_qdrant()
    client.delete(
        collection_name=COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="report_id", match=MatchValue(value=report_id))]
        ),
    )
