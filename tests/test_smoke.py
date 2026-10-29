import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class HarnessTest(unittest.TestCase):
    def test_feature_list_is_consistent(self):
        features = json.loads((ROOT / "feature_list.json").read_text(encoding="utf-8"))
        ids = [f["id"] for f in features]
        self.assertEqual(len(ids), len(set(ids)), "duplicate feature ids")
        in_progress = [f for f in features if f["status"] == "in_progress"]
        self.assertLessEqual(len(in_progress), 1)
        for f in features:
            for dep in f["depends_on"]:
                self.assertIn(dep, ids, f["id"])
            if f["status"] in ("passing", "accepted"):
                self.assertTrue(f["evidence"], "%s is %s without evidence" % (f["id"], f["status"]))


if __name__ == "__main__":
    unittest.main()
