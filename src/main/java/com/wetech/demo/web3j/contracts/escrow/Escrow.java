package com.wetech.demo.web3j.contracts.escrow;

import io.reactivex.Flowable;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.DynamicStruct;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.BaseEventResponse;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

/**
 * <p>Auto generated code.
 * <p><strong>Do not modify!</strong>
 * <p>Please use the <a href="https://docs.web3j.io/command_line.html">web3j command line tools</a>,
 * or the org.web3j.codegen.SolidityFunctionWrapperGenerator in the 
 * <a href="https://github.com/LFDT-web3j/web3j/tree/main/codegen">codegen module</a> to update.
 *
 * <p>Generated with web3j version 4.14.0.
 */
@SuppressWarnings("rawtypes")
public class Escrow extends Contract {
    public static final String BINARY = "6080604052348015600e575f5ffd5b506040516112f03803806112f0833981016040819052602b9160b3565b6001600160a01b03811660905760405162461bcd60e51b815260206004820152602360248201527f457363726f773a206172626974657220697320746865207a65726f206164647260448201526265737360e81b606482015260840160405180910390fd5b5f80546001600160a01b0319166001600160a01b039290921691909117905560de565b5f6020828403121560c2575f5ffd5b81516001600160a01b038116811460d7575f5ffd5b9392505050565b611205806100eb5f395ff3fe608060405234801561000f575f5ffd5b5060043610610090575f3560e01c806386d6282c1161006357806386d6282c146100eb578063b6b55f25146100fe578063ba0179b514610111578063d09ef24114610124578063fe25e00a14610144575f5ffd5b806302bd3421146100945780632453ffa8146100ba578063278ecde1146100c357806352a34b05146100d8575b5f5ffd5b6100a76100a2366004610db9565b61016e565b6040519081526020015b60405180910390f35b6100a760015481565b6100d66100d1366004610e9f565b610435565b005b6100d66100e6366004610ec6565b6105d9565b6100d66100f9366004610e9f565b61080c565b6100d661010c366004610e9f565b61093e565b6100d661011f366004610e9f565b610a88565b610137610132366004610e9f565b610bd3565b6040516100b19190610f56565b5f54610156906001600160a01b031681565b6040516001600160a01b0390911681526020016100b1565b5f6001600160a01b0386166101ca5760405162461bcd60e51b815260206004820152601e60248201527f457363726f773a2073656c6c6572206973207a65726f2061646472657373000060448201526064015b60405180910390fd5b6001600160a01b03861633036102325760405162461bcd60e51b815260206004820152602760248201527f457363726f773a2063616e6e6f7420637265617465206f7264657220746f207960448201526637bab939b2b63360c91b60648201526084016101c1565b5f84116102815760405162461bcd60e51b815260206004820152601f60248201527f457363726f773a20616d6f756e74206d75737420626520706f7369746976650060448201526064016101c1565b4283116102db5760405162461bcd60e51b815260206004820152602260248201527f457363726f773a20646561646c696e65206d75737420626520696e2066757475604482015261726560f01b60648201526084016101c1565b600180546040805160e0810182523381526001600160a01b038a811660208084019182528b8316848601908152606085018c8152608086018c81525f60a0880181815260c089018e90528a8252600295869052989020875181549088166001600160a01b03199182161782559551818c018054918916918816919091179055925193830180549490961693909416929092179093555160038301555160048083019190915592516005820180549596939592949193909260ff19169184908111156103a8576103a8610ef4565b021790555060c082015160068201906103c19082611065565b50506001805491505f6103d383611124565b9091555050604080516001600160a01b0388811682526020820188905291810186905290881690339083907fa4be1e061958d160de04db54668a64922c36d2765b16644ae91acf127708970e9060600160405180910390a49695505050505050565b5f8181526002602052604090205481906001600160a01b0316331461046c5760405162461bcd60e51b81526004016101c190611148565b816001805f8381526002602052604090206005015460ff16600481111561049557610495610ef4565b146104b25760405162461bcd60e51b81526004016101c19061117f565b5f8481526002602052604090206004015442116105115760405162461bcd60e51b815260206004820152601c60248201527f457363726f773a20646561646c696e65206e6f7420726561636865640000000060448201526064016101c1565b5f8481526002602081905260409182902060058101805460ff1916600390811790915591810154910154915163a9059cbb60e01b815233600482015260248101929092526001600160a01b03169063a9059cbb906044016020604051808303815f875af1158015610584573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906105a891906111ad565b5060405184907f303a31648d19f17852cf82657162c4bdd4a06ab3f36f1e7ae1118f4ca6473e11905f90a250505050565b5f546001600160a01b0316331461063c5760405162461bcd60e51b815260206004820152602160248201527f457363726f773a2063616c6c6572206973206e6f7420746865206172626974656044820152603960f91b60648201526084016101c1565b816004805f8381526002602052604090206005015460ff16600481111561066557610665610ef4565b146106825760405162461bcd60e51b81526004016101c19061117f565b821561072b575f8481526002602081905260409182902060058101805460ff191683179055908101546001820154600390920154925163a9059cbb60e01b81526001600160a01b0392831660048201526024810193909352169063a9059cbb906044016020604051808303815f875af1158015610701573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061072591906111ad565b506107ca565b5f8481526002602081905260409182902060058101805460ff191660039081179091559181015481549290910154925163a9059cbb60e01b81526001600160a01b0392831660048201526024810193909352169063a9059cbb906044016020604051808303815f875af11580156107a4573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906107c891906111ad565b505b837f649ff37700d4eb8a5bc86ef06a55183597fa5c3c6b53ec4b9ee510cb2089ee26846040516107fe911515815260200190565b60405180910390a250505050565b806001805f8381526002602052604090206005015460ff16600481111561083557610835610ef4565b146108525760405162461bcd60e51b81526004016101c19061117f565b5f838152600260205260409020546001600160a01b031633148061088e57505f838152600260205260409020600101546001600160a01b031633145b6108e85760405162461bcd60e51b815260206004820152602560248201527f457363726f773a2063616c6c6572206973206e6f74206275796572206f72207360448201526432b63632b960d91b60648201526084016101c1565b5f83815260026020908152604091829020600501805460ff19166004179055905133815284917fde481be1936299e9233634e9f3cd92028f797634de15defa790fb2d7a013c95a910160405180910390a2505050565b5f8181526002602052604090205481906001600160a01b031633146109755760405162461bcd60e51b81526004016101c190611148565b815f805f8381526002602052604090206005015460ff16600481111561099d5761099d610ef4565b146109ba5760405162461bcd60e51b81526004016101c19061117f565b5f8481526002602081905260409182902060058101805460ff191660011790559081015460039091015491516323b872dd60e01b815233600482015230602482015260448101929092526001600160a01b0316906323b872dd906064016020604051808303815f875af1158015610a33573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a5791906111ad565b5060405184907f15e33efda35e5da2fb096ba49585307ba468af144aea691da964aaff1a7f3a57905f90a250505050565b5f8181526002602052604090205481906001600160a01b03163314610abf5760405162461bcd60e51b81526004016101c190611148565b816001805f8381526002602052604090206005015460ff166004811115610ae857610ae8610ef4565b14610b055760405162461bcd60e51b81526004016101c19061117f565b5f8481526002602081905260409182902060058101805460ff191683179055908101546001820154600390920154925163a9059cbb60e01b81526001600160a01b0392831660048201526024810193909352169063a9059cbb906044016020604051808303815f875af1158015610b7e573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610ba291906111ad565b5060405184907f02a7d4d9472af7118644884b9a0ee443540c0027e938dd0aa35be8ecbe946c0a905f90a250505050565b610c126040805160e0810182525f8082526020820181905291810182905260608101829052608081018290529060a08201908152602001606081525090565b6001548210610c635760405162461bcd60e51b815260206004820152601c60248201527f457363726f773a206f7264657220646f6573206e6f742065786973740000000060448201526064016101c1565b5f82815260026020818152604092839020835160e08101855281546001600160a01b03908116825260018301548116938201939093529281015490911692820192909252600382015460608201526004808301546080830152600583015491929160a084019160ff90911690811115610cde57610cde610ef4565b6004811115610cef57610cef610ef4565b8152602001600682018054610d0390610fd6565b80601f0160208091040260200160405190810160405280929190818152602001828054610d2f90610fd6565b8015610d7a5780601f10610d5157610100808354040283529160200191610d7a565b820191905f5260205f20905b815481529060010190602001808311610d5d57829003601f168201915b5050505050815250509050919050565b80356001600160a01b0381168114610da0575f5ffd5b919050565b634e487b7160e01b5f52604160045260245ffd5b5f5f5f5f5f60a08688031215610dcd575f5ffd5b610dd686610d8a565b9450610de460208701610d8a565b93506040860135925060608601359150608086013567ffffffffffffffff811115610e0d575f5ffd5b8601601f81018813610e1d575f5ffd5b803567ffffffffffffffff811115610e3757610e37610da5565b604051601f8201601f19908116603f0116810167ffffffffffffffff81118282101715610e6657610e66610da5565b6040528181528282016020018a1015610e7d575f5ffd5b816020840160208301375f602083830101528093505050509295509295909350565b5f60208284031215610eaf575f5ffd5b5035919050565b8015158114610ec3575f5ffd5b50565b5f5f60408385031215610ed7575f5ffd5b823591506020830135610ee981610eb6565b809150509250929050565b634e487b7160e01b5f52602160045260245ffd5b60058110610f2457634e487b7160e01b5f52602160045260245ffd5b9052565b5f81518084528060208401602086015e5f602082860101526020601f19601f83011685010191505092915050565b6020815260018060a01b03825116602082015260018060a01b03602083015116604082015260018060a01b03604083015116606082015260608201516080820152608082015160a08201525f60a0830151610fb460c0840182610f08565b5060c083015160e080840152610fce610100840182610f28565b949350505050565b600181811c90821680610fea57607f821691505b60208210810361100857634e487b7160e01b5f52602260045260245ffd5b50919050565b601f821115611060578282111561106057805f5260205f20601f840160051c602085101561103957505f5b90810190601f840160051c035f5b8181101561105c575f83820155600101611047565b5050505b505050565b815167ffffffffffffffff81111561107f5761107f610da5565b6110938161108d8454610fd6565b8461100e565b6020601f8211600181146110c5575f83156110ae5750848201515b5f19600385901b1c1916600184901b17845561111d565b5f84815260208120601f198516915b828110156110f457878501518255602094850194600190920191016110d4565b508482101561111157868401515f19600387901b60f8161c191681555b505060018360011b0184555b5050505050565b5f6001820161114157634e487b7160e01b5f52601160045260245ffd5b5060010190565b6020808252601f908201527f457363726f773a2063616c6c6572206973206e6f742074686520627579657200604082015260600190565b602080825260149082015273457363726f773a2077726f6e672073746174757360601b604082015260600190565b5f602082840312156111bd575f5ffd5b81516111c881610eb6565b939250505056fea2646970667358221220dbf7a2e693a7f60ebd2daffed71e7bf844593de34d130c5d68fcb7045e22493d64736f6c63430008230033";

    private static String librariesLinkedBinary;

    public static final String FUNC_ARBITER = "arbiter";

    public static final String FUNC_CONFIRM = "confirm";

    public static final String FUNC_CREATEORDER = "createOrder";

    public static final String FUNC_DEPOSIT = "deposit";

    public static final String FUNC_DISPUTE = "dispute";

    public static final String FUNC_GETORDER = "getOrder";

    public static final String FUNC_ORDERCOUNT = "orderCount";

    public static final String FUNC_REFUND = "refund";

    public static final String FUNC_RESOLVE = "resolve";

    public static final Event ORDERCOMPLETED_EVENT = new Event("OrderCompleted", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}));
    ;

    public static final Event ORDERCREATED_EVENT = new Event("OrderCreated", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}, new TypeReference<Address>(true) {}, new TypeReference<Address>(true) {}, new TypeReference<Address>() {}, new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
    ;

    public static final Event ORDERDISPUTED_EVENT = new Event("OrderDisputed", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}, new TypeReference<Address>() {}));
    ;

    public static final Event ORDERPAID_EVENT = new Event("OrderPaid", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}));
    ;

    public static final Event ORDERREFUNDED_EVENT = new Event("OrderRefunded", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}));
    ;

    public static final Event ORDERRESOLVED_EVENT = new Event("OrderResolved", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}, new TypeReference<Bool>() {}));
    ;

    @Deprecated
    protected Escrow(String contractAddress, Web3j web3j, Credentials credentials,
            BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    protected Escrow(String contractAddress, Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, credentials, contractGasProvider);
    }

    @Deprecated
    protected Escrow(String contractAddress, Web3j web3j, TransactionManager transactionManager,
            BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    protected Escrow(String contractAddress, Web3j web3j, TransactionManager transactionManager,
            ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static List<OrderCompletedEventResponse> getOrderCompletedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(ORDERCOMPLETED_EVENT, transactionReceipt);
        ArrayList<OrderCompletedEventResponse> responses = new ArrayList<OrderCompletedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderCompletedEventResponse typedResponse = new OrderCompletedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static OrderCompletedEventResponse getOrderCompletedEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(ORDERCOMPLETED_EVENT, log);
        OrderCompletedEventResponse typedResponse = new OrderCompletedEventResponse();
        typedResponse.log = log;
        typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<OrderCompletedEventResponse> orderCompletedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getOrderCompletedEventFromLog(log));
    }

    public Flowable<OrderCompletedEventResponse> orderCompletedEventFlowable(
            DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ORDERCOMPLETED_EVENT));
        return orderCompletedEventFlowable(filter);
    }

    public static List<OrderCreatedEventResponse> getOrderCreatedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(ORDERCREATED_EVENT, transactionReceipt);
        ArrayList<OrderCreatedEventResponse> responses = new ArrayList<OrderCreatedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderCreatedEventResponse typedResponse = new OrderCreatedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.buyer = (String) eventValues.getIndexedValues().get(1).getValue();
            typedResponse.seller = (String) eventValues.getIndexedValues().get(2).getValue();
            typedResponse.token = (String) eventValues.getNonIndexedValues().get(0).getValue();
            typedResponse.amount = (BigInteger) eventValues.getNonIndexedValues().get(1).getValue();
            typedResponse.deadline = (BigInteger) eventValues.getNonIndexedValues().get(2).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static OrderCreatedEventResponse getOrderCreatedEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(ORDERCREATED_EVENT, log);
        OrderCreatedEventResponse typedResponse = new OrderCreatedEventResponse();
        typedResponse.log = log;
        typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
        typedResponse.buyer = (String) eventValues.getIndexedValues().get(1).getValue();
        typedResponse.seller = (String) eventValues.getIndexedValues().get(2).getValue();
        typedResponse.token = (String) eventValues.getNonIndexedValues().get(0).getValue();
        typedResponse.amount = (BigInteger) eventValues.getNonIndexedValues().get(1).getValue();
        typedResponse.deadline = (BigInteger) eventValues.getNonIndexedValues().get(2).getValue();
        return typedResponse;
    }

    public Flowable<OrderCreatedEventResponse> orderCreatedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getOrderCreatedEventFromLog(log));
    }

    public Flowable<OrderCreatedEventResponse> orderCreatedEventFlowable(
            DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ORDERCREATED_EVENT));
        return orderCreatedEventFlowable(filter);
    }

    public static List<OrderDisputedEventResponse> getOrderDisputedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(ORDERDISPUTED_EVENT, transactionReceipt);
        ArrayList<OrderDisputedEventResponse> responses = new ArrayList<OrderDisputedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderDisputedEventResponse typedResponse = new OrderDisputedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.by = (String) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static OrderDisputedEventResponse getOrderDisputedEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(ORDERDISPUTED_EVENT, log);
        OrderDisputedEventResponse typedResponse = new OrderDisputedEventResponse();
        typedResponse.log = log;
        typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
        typedResponse.by = (String) eventValues.getNonIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<OrderDisputedEventResponse> orderDisputedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getOrderDisputedEventFromLog(log));
    }

    public Flowable<OrderDisputedEventResponse> orderDisputedEventFlowable(
            DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ORDERDISPUTED_EVENT));
        return orderDisputedEventFlowable(filter);
    }

    public static List<OrderPaidEventResponse> getOrderPaidEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(ORDERPAID_EVENT, transactionReceipt);
        ArrayList<OrderPaidEventResponse> responses = new ArrayList<OrderPaidEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderPaidEventResponse typedResponse = new OrderPaidEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static OrderPaidEventResponse getOrderPaidEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(ORDERPAID_EVENT, log);
        OrderPaidEventResponse typedResponse = new OrderPaidEventResponse();
        typedResponse.log = log;
        typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<OrderPaidEventResponse> orderPaidEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getOrderPaidEventFromLog(log));
    }

    public Flowable<OrderPaidEventResponse> orderPaidEventFlowable(DefaultBlockParameter startBlock,
            DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ORDERPAID_EVENT));
        return orderPaidEventFlowable(filter);
    }

    public static List<OrderRefundedEventResponse> getOrderRefundedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(ORDERREFUNDED_EVENT, transactionReceipt);
        ArrayList<OrderRefundedEventResponse> responses = new ArrayList<OrderRefundedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderRefundedEventResponse typedResponse = new OrderRefundedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static OrderRefundedEventResponse getOrderRefundedEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(ORDERREFUNDED_EVENT, log);
        OrderRefundedEventResponse typedResponse = new OrderRefundedEventResponse();
        typedResponse.log = log;
        typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<OrderRefundedEventResponse> orderRefundedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getOrderRefundedEventFromLog(log));
    }

    public Flowable<OrderRefundedEventResponse> orderRefundedEventFlowable(
            DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ORDERREFUNDED_EVENT));
        return orderRefundedEventFlowable(filter);
    }

    public static List<OrderResolvedEventResponse> getOrderResolvedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(ORDERRESOLVED_EVENT, transactionReceipt);
        ArrayList<OrderResolvedEventResponse> responses = new ArrayList<OrderResolvedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderResolvedEventResponse typedResponse = new OrderResolvedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.sellerWins = (Boolean) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static OrderResolvedEventResponse getOrderResolvedEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(ORDERRESOLVED_EVENT, log);
        OrderResolvedEventResponse typedResponse = new OrderResolvedEventResponse();
        typedResponse.log = log;
        typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
        typedResponse.sellerWins = (Boolean) eventValues.getNonIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<OrderResolvedEventResponse> orderResolvedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getOrderResolvedEventFromLog(log));
    }

    public Flowable<OrderResolvedEventResponse> orderResolvedEventFlowable(
            DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ORDERRESOLVED_EVENT));
        return orderResolvedEventFlowable(filter);
    }

    public RemoteFunctionCall<String> arbiter() {
        final Function function = new Function(FUNC_ARBITER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteFunctionCall<TransactionReceipt> confirm(BigInteger id) {
        final Function function = new Function(
                FUNC_CONFIRM, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(id)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> createOrder(String seller, String token,
            BigInteger amount, BigInteger deadline, String description) {
        final Function function = new Function(
                FUNC_CREATEORDER, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, seller), 
                new org.web3j.abi.datatypes.Address(160, token), 
                new org.web3j.abi.datatypes.generated.Uint256(amount), 
                new org.web3j.abi.datatypes.generated.Uint256(deadline), 
                new org.web3j.abi.datatypes.Utf8String(description)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> deposit(BigInteger id) {
        final Function function = new Function(
                FUNC_DEPOSIT, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(id)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> dispute(BigInteger id) {
        final Function function = new Function(
                FUNC_DISPUTE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(id)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Order> getOrder(BigInteger id) {
        final Function function = new Function(FUNC_GETORDER, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(id)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Order>() {}));
        return executeRemoteCallSingleValueReturn(function, Order.class);
    }

    public RemoteFunctionCall<BigInteger> orderCount() {
        final Function function = new Function(FUNC_ORDERCOUNT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<TransactionReceipt> refund(BigInteger id) {
        final Function function = new Function(
                FUNC_REFUND, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(id)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> resolve(BigInteger id, Boolean sellerWins) {
        final Function function = new Function(
                FUNC_RESOLVE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(id), 
                new org.web3j.abi.datatypes.Bool(sellerWins)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    @Deprecated
    public static Escrow load(String contractAddress, Web3j web3j, Credentials credentials,
            BigInteger gasPrice, BigInteger gasLimit) {
        return new Escrow(contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    @Deprecated
    public static Escrow load(String contractAddress, Web3j web3j,
            TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return new Escrow(contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    public static Escrow load(String contractAddress, Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider) {
        return new Escrow(contractAddress, web3j, credentials, contractGasProvider);
    }

    public static Escrow load(String contractAddress, Web3j web3j,
            TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return new Escrow(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static RemoteCall<Escrow> deploy(Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider, String _arbiter) {
        String encodedConstructor = FunctionEncoder.encodeConstructor(Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _arbiter)));
        return deployRemoteCall(Escrow.class, web3j, credentials, contractGasProvider, getDeploymentBinary(), encodedConstructor);
    }

    public static RemoteCall<Escrow> deploy(Web3j web3j, TransactionManager transactionManager,
            ContractGasProvider contractGasProvider, String _arbiter) {
        String encodedConstructor = FunctionEncoder.encodeConstructor(Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _arbiter)));
        return deployRemoteCall(Escrow.class, web3j, transactionManager, contractGasProvider, getDeploymentBinary(), encodedConstructor);
    }

    @Deprecated
    public static RemoteCall<Escrow> deploy(Web3j web3j, Credentials credentials,
            BigInteger gasPrice, BigInteger gasLimit, String _arbiter) {
        String encodedConstructor = FunctionEncoder.encodeConstructor(Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _arbiter)));
        return deployRemoteCall(Escrow.class, web3j, credentials, gasPrice, gasLimit, getDeploymentBinary(), encodedConstructor);
    }

    @Deprecated
    public static RemoteCall<Escrow> deploy(Web3j web3j, TransactionManager transactionManager,
            BigInteger gasPrice, BigInteger gasLimit, String _arbiter) {
        String encodedConstructor = FunctionEncoder.encodeConstructor(Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _arbiter)));
        return deployRemoteCall(Escrow.class, web3j, transactionManager, gasPrice, gasLimit, getDeploymentBinary(), encodedConstructor);
    }

    public static void linkLibraries(List<Contract.LinkReference> references) {
        librariesLinkedBinary = linkBinaryWithReferences(BINARY, references);
    }

    private static String getDeploymentBinary() {
        if (librariesLinkedBinary != null) {
            return librariesLinkedBinary;
        } else {
            return BINARY;
        }
    }

    public static class Order extends DynamicStruct {
        public String buyer;

        public String seller;

        public String token;

        public BigInteger amount;

        public BigInteger deadline;

        public BigInteger status;

        public String description;

        public Order(String buyer, String seller, String token, BigInteger amount,
                BigInteger deadline, BigInteger status, String description) {
            super(new org.web3j.abi.datatypes.Address(160, buyer), 
                    new org.web3j.abi.datatypes.Address(160, seller), 
                    new org.web3j.abi.datatypes.Address(160, token), 
                    new org.web3j.abi.datatypes.generated.Uint256(amount), 
                    new org.web3j.abi.datatypes.generated.Uint256(deadline), 
                    new org.web3j.abi.datatypes.generated.Uint8(status), 
                    new org.web3j.abi.datatypes.Utf8String(description));
            this.buyer = buyer;
            this.seller = seller;
            this.token = token;
            this.amount = amount;
            this.deadline = deadline;
            this.status = status;
            this.description = description;
        }

        public Order(Address buyer, Address seller, Address token, Uint256 amount, Uint256 deadline,
                Uint8 status, Utf8String description) {
            super(buyer, seller, token, amount, deadline, status, description);
            this.buyer = buyer.getValue();
            this.seller = seller.getValue();
            this.token = token.getValue();
            this.amount = amount.getValue();
            this.deadline = deadline.getValue();
            this.status = status.getValue();
            this.description = description.getValue();
        }
    }

    public static class OrderCompletedEventResponse extends BaseEventResponse {
        public BigInteger id;
    }

    public static class OrderCreatedEventResponse extends BaseEventResponse {
        public BigInteger id;

        public String buyer;

        public String seller;

        public String token;

        public BigInteger amount;

        public BigInteger deadline;
    }

    public static class OrderDisputedEventResponse extends BaseEventResponse {
        public BigInteger id;

        public String by;
    }

    public static class OrderPaidEventResponse extends BaseEventResponse {
        public BigInteger id;
    }

    public static class OrderRefundedEventResponse extends BaseEventResponse {
        public BigInteger id;
    }

    public static class OrderResolvedEventResponse extends BaseEventResponse {
        public BigInteger id;

        public Boolean sellerWins;
    }
}
