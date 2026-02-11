import { v4 as uuidv4 } from "uuid";
import { encodeAbiParameters, encodeFunctionData } from "viem";

import { TESTNET } from "../../contracts.js";
import { DaoSpaceAbi, SpaceRegistryAbi } from "../abis/index.js";
import { assertValid } from "../id-utils.js";
import * as Ipfs from "../ipfs.js";
import {
  bytes16ToBytes32LeftAligned,
  EMPTY_SIGNATURE,
  EMPTY_TOPIC,
  isBytes16Hex,
  PROPOSAL_CREATED_ACTION,
} from "./constants.js";
import type { ProposeEditParams, ProposeEditResult } from "./types.js";

/**
 * Creates a proposal to publish an edit to a DAO space.
 *
 * This function:
 * 1. Publishes the ops to IPFS using the GRC-20 binary format
 * 2. Generates a unique proposal ID (or uses the provided one)
 * 3. Encodes the proposal data for the SpaceRegistry's `enter()` function
 *
 * The proposal, when executed, will call the DAO space's `publish()` function
 * to publish the edit. Since `publish()` is a valid fast-path action, with
 * FAST voting mode and sufficient votes, the proposal will auto-execute.
 *
 * @param params - The parameters for creating the proposal
 * @returns Object containing `editId`, `cid`, `to` (Space Registry address),
 *          `calldata`, and `proposalId`
 *
 * @example
 * ```ts
 * import { daoSpace, Graph } from '@geoprotocol/geo-sdk';
 *
 * const { ops } = Graph.createEntity({ name: 'New Entity' });
 * const { editId, cid, to, calldata, proposalId } = await daoSpace.proposeEdit({
 *   name: 'Add new entity',
 *   ops,
 *   author: 'your-personal-space-id',
 *   daoSpaceAddress: '0xDAOSpaceContractAddress...',
 *   callerSpaceId: '0xCallerBytes16SpaceId...',
 *   daoSpaceId: '0xDAOBytes16SpaceId...',
 * });
 *
 * // Submit the transaction using viem or another client
 * await walletClient.sendTransaction({ to, data: calldata });
 * ```
 */
export async function proposeEdit(
  params: ProposeEditParams,
): Promise<ProposeEditResult> {
  const {
    name,
    ops,
    author,
    daoSpaceAddress,
    callerSpaceId,
    daoSpaceId,
    votingMode = "FAST",
    proposalId: proposalIdInput,
    network = "TESTNET",
  } = params;

  // Validate inputs
  assertValid(author, "`author` in `proposeEdit`");
  if (!isBytes16Hex(callerSpaceId)) {
    throw new Error(
      `callerSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${callerSpaceId}`,
    );
  }
  if (!isBytes16Hex(daoSpaceId)) {
    throw new Error(
      `daoSpaceId must be bytes16 hex (0x followed by 32 hex chars). Received: ${daoSpaceId}`,
    );
  }

  // Publish the edit to IPFS
  const { cid, editId } = await Ipfs.publishEdit({
    name,
    ops,
    author,
    network,
  });

  // Generate or use provided proposal ID (UUID v4 as bytes16 hex)
  const proposalId =
    proposalIdInput ?? (`0x${uuidv4().replaceAll("-", "")}` as `0x${string}`);

  if (!isBytes16Hex(proposalId)) {
    throw new Error(
      `proposalId must be bytes16 hex (0x followed by 32 hex chars). Received: ${proposalId}`,
    );
  }

  // Encode the CID as bytes for the editsContentUri parameter
  const editsContentUri = encodeAbiParameters([{ type: "string" }], [cid]);
  const editsMetadata = "0x" as `0x${string}`;

  // Encode the publish function call: publish(bytes32 _topic, bytes _editsContentUri, bytes _editsMetadata)
  const proposalActionCalldata = encodeFunctionData({
    abi: DaoSpaceAbi,
    functionName: "publish",
    args: [EMPTY_TOPIC, editsContentUri, editsMetadata],
  });

  // Create the proposal action (calling publish on the DAO space)
  const proposalActions = [
    {
      to: daoSpaceAddress,
      value: 0n,
      data: proposalActionCalldata,
    },
  ] as const;

  // Encode the proposal data: abi.encode(bytes16 proposalId, VotingMode votingMode, Action[] actions)
  const data = encodeAbiParameters(
    [
      { type: "bytes16", name: "proposalId" },
      { type: "uint8", name: "votingMode" },
      {
        type: "tuple[]",
        name: "actions",
        components: [
          { type: "address", name: "to" },
          { type: "uint256", name: "value" },
          { type: "bytes", name: "data" },
        ],
      },
    ],
    [proposalId, votingMode === "FAST" ? 1 : 0, proposalActions],
  );

  // Convert proposalId to bytes32 for the topic (left-aligned)
  const topic = bytes16ToBytes32LeftAligned(proposalId);

  // Encode the SpaceRegistry.enter() call
  const calldata = encodeFunctionData({
    abi: SpaceRegistryAbi,
    functionName: "enter",
    args: [
      callerSpaceId, // fromSpaceId
      daoSpaceId, // toSpaceId
      PROPOSAL_CREATED_ACTION, // action
      topic, // topic (proposalId left-aligned to bytes32)
      data, // data (encoded proposal)
      EMPTY_SIGNATURE, // signature (unused when msg.sender == fromSpace)
    ],
  });

  return {
    editId,
    cid,
    to: TESTNET.SPACE_REGISTRY_ADDRESS,
    calldata,
    proposalId,
  };
}
