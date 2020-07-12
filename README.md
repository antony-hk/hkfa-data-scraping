# HKFA Data Scraping Tool
Scraping the data from the official website of Hong Kong Football Association.

## Run in command line
With node.js version 13.2.0 or later, you can run the tool with the following command.

    $ node cli.mjs <type> <ID>

### Example
To get the data of a player whose the ID is 12366 (i.e. [Cheng Chin Lung](https://www.hkfa.com/en/club/4/detail?player=12366)), the following command will do:

    $ node cli.mjs club-player 12366

## Current supported types
* `club`<br>
  Get and parse the data from `https://www.hkfa.com/ch/club/[ID]/detail` and `https://www.hkfa.com/en/club/[ID]/detail`

* `club-player`<br>
  Get and parse the data from `https://www.hkfa.com/ch/club/[any club ID]/detail?player=[ID]` and `https://www.hkfa.com/ch/club/[any club ID]/detail?player=[ID]`

* `league`<br>
  Get and parse the data from `https://www.hkfa.com/ch/league/[ID]` and `https://www.hkfa.com/en/league/[ID]`

## License
MIT
