# Vehicle 3D assets (GLB / GLTF)

Only drop **real** licensed vehicle models here. The app never invents cars from boxes/CSS.

## Vivekkk-1 / 3D-Models (`Cars/*.glb`, BSL-1.0)

Source: [Vivekkk-1/3D-Models](https://github.com/Vivekkk-1/3D-Models)

| Slug                 | Model                    | Size   | Twin notes                                      |
| -------------------- | ------------------------ | ------ | ----------------------------------------------- |
| `bmw-2018`           | BMW 2018 (default)       | ~5 MB  | **Best** — DoorL/R, Hood, Boot                  |
| `ferrari-599`        | Ferrari 599              | ~44 MB | DoorL/R, hood, trunk                            |
| `toyota-supra-mk4`   | Toyota Supra MK4 A80     | ~13 MB | DoorL* / DoorR* named meshes + Paint            |
| `bmw-m8`             | BMW M8 2020              | ~15 MB | Paint / Coloured body (no door split)           |
| `bmw-x6m`            | BMW X6 M                 | ~28 MB | SUV body paint                                  |
| `dodge-challenger-rt`| Dodge Challenger RT      | ~17 MB | Paint body                                      |
| `tesla-roadster`     | Tesla Roadster 2020      | ~25 MB | `car_main_paint`                                |
| `bugatti-bolide`     | Bugatti Bolide 2024      | ~15 MB | Paint + animated door rocker mesh               |
| `ford-gt40`          | Ford GT40                | ~11 MB | Display                                         |
| `lancia-037`         | Lancia 037 Stradale      | ~9 MB  | Display                                         |
| `concept-car-037`    | Concept 037 (CC0)        | ~7 MB  | Public domain                                   |

## Other fleet assets

| Slug              | Path                                  | Notes                    |
| ----------------- | ------------------------------------- | ------------------------ |
| `honda-cr-v`      | `/vehicles/honda-cr-v/model.glb`      | Compact SUV fallback     |
| `jac-1045-truck`  | `/vehicles/jac-1045-truck/model.glb`  | Trucks / bakkies / vans  |

Register files in `AVAILABLE_VEHICLE_ASSETS` (`src/lib/vehicle-model-assets.ts`).

## Not web-loadable

| File                        | Path                                         |
| --------------------------- | -------------------------------------------- |
| 2022 Toyota Hilux GR (.skp) | `/vehicles/_source/2022-toyota-hilux-gr.skp` |

## Mesh naming (lock / open highlight)

```text
DoorL* / DoorR* / doorLeft / doorRight / Door_FL …
Hood* / Bonnet* / Boot* / Trunk* / coveringTrunk
Paint / Coloured / car_main_paint / Body
```
