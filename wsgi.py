#!/usr/bin/env python3
"""Production WSGI entry point for the STEP tree comparison web app."""

import os

from waitress import serve

from app import app


if __name__ == "__main__":
    # Default binds all interfaces for LAN/container use. Put a firewall or reverse
    # proxy in front of public deployments, or set APP_HOST=127.0.0.1 locally.
    host = os.environ.get("APP_HOST", "0.0.0.0")
    port = int(os.environ.get("APP_PORT", "5000"))
    threads = int(os.environ.get("APP_THREADS", "4"))
    serve(app, host=host, port=port, threads=threads)
