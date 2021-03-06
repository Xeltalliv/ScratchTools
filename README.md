# ScratchTools

ScratchTools - a set of simple [Scratch](https://en.wikipedia.org/wiki/Scratch_(programming_language)) related, but mostly unrelated to each other tools.

Many tools from this respository are availible through github-pages.

---

## Description

#### [Img2list](https://xeltalliv.github.io/ScratchTools/Img2list/)

A tool for converting images to lists of numbers in a variaty of ways.


#### [ProjectJsonMinimizer](https://xeltalliv.github.io/ScratchTools/ProjectJsonMinimizer/)

Scratch project file format `.sb3` is actually a zip archive with all of the assets and 1 json file.
That json file has a limit of 5 MiB, and scratch by default wastes a lot of space in it.
This program reduces the size of this json file in a way that can't cause any issues and that remains
persistent even after being loaded and resaved in scratch.


#### [STT-Visualizer](https://xeltalliv.github.io/ScratchTools/STT_Visualizer/)

A tool that allows to convert cloud log of [this](https://scratch.mit.edu/projects/555383076/) project to a human readable format.


#### [SimilarSB3Storage](https://github.com/Xeltalliv/ScratchTools/tree/main/SimilarSB3Storage)

2 simple scripts written in bash that allow storing many versions of the same scratch project in a
space efficient way without storing the same assets multiple times.

```
./compress
```
to disassemble all `.sb3` files in the folder to this space efficient representation.

``` 
./decompress <project name without file extension>
```
to reassemble project back into `.sb3`. File creation dates are preserved.


#### [MassDownloader](https://github.com/Xeltalliv/ScratchTools/tree/main/MassDownloader)

A set of tools, which you can use to prepare yourself for scratch removing ability to view unshared projects.
It includes:
- A python script to download all projects, ids of which are listed in `all.txt` file.
- 2 bash scripts to extract project ids from user activity api and remixtree api.

Asset downloading is disabled by default, because it isn't going to be restricted (at least yet).
Once you are done downloading project jsons, you may want to compress them by doing:
```
tar cvf jsons.tar jsons
xz -9 jsons.tar
```

#### [WadToScratchImporter](https://xeltalliv.github.io/ScratchTools/WadToScratchImporter/)

A tool for automatically importing `.wad` files of [idTech1](https://en.wikipedia.org/wiki/Doom_engine) based games to Vadik1's recreation of this engine in scratch.

---

## License

All files in the repository with the exception of `/vendor` folder are licensed under GNU General Public License v3.0.

Files inside `/vendor` folder have their own license files included along with them.