import { helpText_0 } from './helptext_0.js';
import { helpText_1 } from './helptext_1.js';
import { helpText_2 } from './helptext_2.js';

const helpMap = new Map();

export const helpInit = () =>
{
  helpText_0(helpMap);
  helpText_1(helpMap);
  helpText_2(helpMap);
}

export const helpText = (id) =>
{
  console.log(`help id=${id}`);
  return helpMap.get(id);
}

export const helpTopics =
  [
    { id: 0, text: "What is PixelNut?" },
    {
      id: 10,
      text: "Topic 10",
      children: [
        {
          id: 100,
          text: "Topic 100",
          children: [
            { id: 1000, text: "Topic 1000" },
            { id: 1001, text: "Topic 1001" },
          ],
        },
        {
          id: 110,
          text: "Topic 110",
          children: [
            { id: 1010, text: "Topic 1010" },
            { id: 1011, text: "Topic 1011" },
          ],
        },
      ],
    },
    {
      id: 20,
      text: "How PixelNut Patterns Work",
      children: [
        { id: 200, text: "Command Definitions" },
        { id: 201, text: "LightWave Example" },
      ],
    },
  ];
