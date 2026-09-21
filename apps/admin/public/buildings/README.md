# Building 3D assets (GLB / GLTF)

Used by alarm / property views. Real models only — no procedural buildings.

## Currently available

| Kind      | Property types | Path                             |
| --------- | -------------- | -------------------------------- |
| Warehouse | `WAREHOUSE`    | `/buildings/warehouse/model.glb` |

## Left blank for now

- Houses (`HOUSE`, `TOWNHOUSE`, `ESTATE`, `RESIDENTIAL`, …)
- Apartments (`APARTMENT`)
- Shopping malls (`MALL`)

Those site types show **3D MODEL NOT AVAILABLE** until assets are added.

## Layout

```text
public/buildings/
  warehouse/model.glb
  house/       (removed — no asset)
  apartment/   (future)
  mall/        (future)
```

Register new kinds in `src/lib/building-model-assets.ts`.
