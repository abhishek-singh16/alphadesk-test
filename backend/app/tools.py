"""Desk tools. Session 03: filings search. Session 04 adds live market tools.

Everything the agent can *do* (beyond talking) lives in this file.
"""

import chromadb
from chromadb.config import Settings
import yfinance as yf
from langchain_core.tools import tool
import logging,sys

_filings = None


def _collection():
    # Lazy singleton: the Chroma client only spins up (and loads the local
    # embedding model) the first time a filings question actually arrives.
    global _filings
    if _filings is None:
        client = chromadb.PersistentClient(
            path="./chroma_db", settings=Settings(anonymized_telemetry=False)
        )
        _filings = client.get_or_create_collection("filings")
    return _filings


def search_filings(query: str, k: int = 10) -> list[dict]:
    """Dense retrieval over the ingested filings: embed the query, return the
    k nearest chunks with the metadata a citation needs."""
    if _collection().count() == 0:
        return []  # nothing ingested yet — the caller says so, honestly
    result = _collection().query(query_texts=[query], n_results=k)
    return [
        {"text": doc, "source": meta["source"], "page": meta["page"]}
        for doc, meta in zip(result["documents"][0], result["metadatas"][0])
    ]

@tool
def get_price_history(ticker: str, period: str = "1mo") -> dict:
    "Daily closing prices of stocks, ['5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']"
    try:
        closes = yf.Ticker(ticker).history(period=period)["Close"]
        if closes.empty:
            return {"error": f"No price history for '{ticker}' over the period '{period}'."}
        max_val = max(1, len(closes) // 30)  # limit to ~30 points for brevity
        return {
            "ticker": ticker,
            "period": period,
            "closes": [round(c, 2) for c in closes.tolist()[::max_val]],
        }  
    except Exception as e:
        return {"error": f"Failed to retrieve price history for '{ticker}': {str(e)}"}

@tool
def get_quotes(ticker: str) -> dict:
    "Live Quote for a stock ticker."
    try:
        t = yf.Ticker(ticker)
        try:
            info = t.fast_info
            price, prev = info["lastPrice"], info["previousClose"]
            currency = info["currency"]
        except (KeyError, Exception):
            # fast_info can break silently when Yahoo changes response shape;
            # .info is slower but more stable as a fallback.
            info = t.info
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            prev = info.get("previousClose")
            currency = info.get("currency", "USD")
            if price is None or prev is None:
                raise ValueError(f"No price data available for '{ticker}'")
        return {
            "ticker": ticker,
            "price": round(price, 2),
            "currency": currency,
            "change": round(price - prev, 2),
            "percent_change": round((price - prev) / prev * 100, 2),
        }
    except Exception as e:
        return {"error": f"Failed to retrieve quote for '{ticker}': {str(e)}"}

MARKET_TOOLS = [get_quotes, get_price_history]