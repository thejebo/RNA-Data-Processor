# RNA Data Processor

## Purpose
The RNA Data Processor project emerged to address the challenges associated with processing large datasets of strings, each linked to multiple values. Key objectives include:

- Filtering strings based on various parameters, such as length and behavior of associated values.
- Ensuring string uniqueness across multiple datasets.
- Allocating similar strings into groups.
- Sorting strings based on their associated values.

## Example Input Data
Consider the following example input data:

| String      | Value 1 | Value 2 | Value 3 | Value 4 |
|-------------|---------|---------|---------|---------|
| AAAAAAAA    | 1       | 2       | 3       | 4       |
| BBBBBBBB    | 0       | 2       | 1       | 8       |
| CCCCCCCC    | 10      | 20      | 11      | 100     |
| DDDDDDDDDDD | 10      | 20      | 50      | 100     |
| FFFFAAAB    | 50      | 70      | 100     | 101     |

The project is specifically tailored for processing RNA data, incorporating terminology relevant to that context.

## File Structure
- `src/`: Contains all the tools for performing a process.
- `input/` and `output/`: Organizational folders for input and output files. The program does not enforce their use.
- `scripts/`: Another organizational folder for various scripts used to perform different tasks.

## Usage

### Prerequisites
The only requirement is to have [NodeJS](https://nodejs.org/en) installed. The project lacks a user interface; scripts must be created and run via the command prompt.

### Installation
Run `npm i` or `npm install` in the command prompt to install required third-party packages.

### Writing Scripts
The project features a special class, `RNA`, handling most logic. All `RNA` class methods are static. Additionally, there are `CSV` and `Excel` handler classes for file reading and saving. The `Exporter` class serves as an interface for both `CSV` and `Excel` classes.

## Provided Examples
The project includes example scripts showcasing tool usage. Examples are organized into folders, each with an `index.js` file for execution. Input and output folders store data submitted for processing and the corresponding output, respectively.

### Creating Groups of Strings
Run the following command to execute the example:
```bash
npm run examples/form-str-groups-1/index.js
```

This example processes a dataset from `input.csv`, forming groups of strings. Groups are created if `2 - n` strings share a common substring of length `X`. The script produces two files similar to `input.csv`, but with an added Group column indicating the associated group for each string. Note that a string can belong to multiple groups.