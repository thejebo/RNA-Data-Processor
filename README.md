# Purpose of project
- The project arose from the need of processing large dataset of strings which associated with multiple values.
- From the dataset, strings had to be filtered with different parameters. For example:
-- a string has to be certain length.
-- the string's values have to behave certain way.
-- the string must be unique accross multiple datasets.

Also:
- Similar strings needed to be allocated to groups.
- Strings had to be sorted according to the associated values.

## Example of the input data
| String | Value 1 | Value 2 | Value 3 | Value 4|
| --- | --- | --- | --- | --- |
| AAAAAAAA | 1 | 2 | 3 | 4 |
| BBBBBBBB | 0 | 2 | 1 | 8 |
| CCCCCCCC | 10 | 20 | 11 | 100 |
| DDDDDDDDDDD | 10 | 20 | 50 | 100 |
| FFFFAAAB | 50 | 70 | 100 | 101 |

The project was specifically made to deal with processed RNA-data, thus having references to terminology used within that context.

# Disclamer
Regarless of the initial purpose of processing RNA-data, the project has been made purely with hobbiyst-set-of-mind and the author doesn't have any scientific background.

# File structure
- `src/`: Folder enhouses all the tools for performing a process.
- `input/` and `output/`: Folders are just for organizational reasons. `input/` for keeping the files that are supplied to a process and `output/` for the processes output files. The program doesn't enforce to use these folder for input/output.
- `scripts/`: Another folder for organizational reasons. The project does not contain a specific index-file which can be run, but a developer can run various scripts perform various tasks.

# Usage
The project has one special class, `RNA`, which handles most of the logic. There are also CSV/Excel handler classes, that handles file reading and saving to respective file formats. The `Exporter`-class acts as an interface for both CSV- and Excel-classes.

# Provided examples