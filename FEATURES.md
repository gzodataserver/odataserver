Feature branches
================

The [git-workflow](http://colmsjo.com/Git-Workflow/) method is used.
This file is used to track the content of each feature branch.

There are two main branches:

 * master - contains releases
 * develop - features are merged here and then released once ready

And there is one branch for each feature that is developed. These
branches are deleted once the feature has been merged.


feature1
--------

A response currently looks like this:

{
  "d": {
    "results": {
      "accountId": "0b213a639078",
      "value": [
        {
          "col1": 11,
          "col2": "11",
          "@odata.etag": "6369f0832533e140100edb005805e72e"
        },
        {
          "col1": 11,
          "col2": "11",
          "@odata.etag": "6369f0832533e140100edb005805e72e"
        }
      ]
    }
  }
}

But is should look like this according to the spec:

{
  "d": {
    "accountId": "0b213a639078",
    "results": [
      {
        "col1": 11,
        "col2": "11",
        "@odata.etag": "6369f0832533e140100edb005805e72e"
      },
      {
        "col1": 11,
        "col2": "11",
        "@odata.etag": "6369f0832533e140100edb005805e72e"
      }
    ]
  }
}
