import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"===============================================================")
    print(f"  OmniInspect — Legal Metrology Digital Inspection Engine v2026  ")
    print(f"  Official Problem Statement: SIH26034                          ")
    print(f"  Server listening on http://127.0.0.1:{port}                    ")
    print(f"===============================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
