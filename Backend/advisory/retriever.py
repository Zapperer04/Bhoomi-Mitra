from advisory.data import get_advisory

def retrieve(entities: dict):
    crop = entities.get("crop")
    stage = entities.get("stage")

    if not crop:
        return None

    return get_advisory(crop, stage)
