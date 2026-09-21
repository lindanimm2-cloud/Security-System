# Vehicle 3D assets (GLB / GLTF)

Only drop **real** licensed vehicle models here. The app never invents cars from boxes/CSS.

## FormDrive ([nesdesignco/FormDrive](https://github.com/nesdesignco/FormDrive))

| Slug                 | Model              | Notes                          |
| -------------------- | ------------------ | ------------------------------ |
| `ford-mustang-2005`  | Mustang 2005       | See MUSTANG license in upstream |
| `tesla-model-3`      | Tesla Model 3 2018 | **Default sedan** · TESLA license |

## 3d-car-viewing ([jiaxiantao/3d-car-viewing](https://github.com/jiaxiantao/3d-car-viewing))

Quaternius / Poly Pizza CC0 mainstream set:

| Slug                  | Category |
| --------------------- | -------- |
| `suv-mainstream`      | SUV      |
| `offroad-mainstream`  | Off-road |

(`sedan-mainstream` was a BMW M2 demo mesh — **not** included.)

## Other fleet assets

| Slug                  | Notes                                      |
| --------------------- | ------------------------------------------ |
| `ferrari-599`         | DoorL/R, hood, trunk                       |
| `toyota-supra-mk4`    | Named door meshes + paint                  |
| `dodge-challenger-rt` | Paint body                                 |
| `tesla-roadster`      | Paint body                                 |
| `bugatti-bolide`      | Paint + rocker                             |
| `ford-gt40`           | Display                                    |
| `lancia-037`          | Display                                    |
| `concept-car-037`     | CC0                                        |
| `honda-cr-v`          | Compact SUV                                |
| `jac-1045-truck`      | **Only truck** — bakkies / vans / sprinter |

BMW GLBs (`bmw-2018`, `bmw-m8`, `bmw-x6m`) have been removed from the catalog.

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
