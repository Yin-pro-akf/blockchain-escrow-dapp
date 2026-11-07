// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Escrow {
    enum Status { Created, Paid, Completed, Refunded, Disputed, Shipped }

    struct Order {
        address buyer;
        address seller;
        address token;
        uint256 amount;   // 代币最小单位
        uint256 deadline; // Unix 时间戳，单位为秒
        Status status;
        string description;
    }

    address public arbiter;
    uint256 public orderCount;
    mapping(uint256 => Order) private _orders;

    event OrderCreated(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        address token,
        uint256 amount,
        uint256 deadline
    );
    event OrderPaid(uint256 indexed id);
    event OrderShipped(uint256 indexed id);
    event OrderCompleted(uint256 indexed id);
    event OrderRefunded(uint256 indexed id);
    event OrderDisputed(uint256 indexed id, address by);
    event OrderResolved(uint256 indexed id, bool sellerWins);

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Escrow: caller is not the arbiter");
        _;
    }

    modifier onlyBuyer(uint256 id) {
        require(msg.sender == _orders[id].buyer, "Escrow: caller is not the buyer");
        _;
    }

    modifier inStatus(uint256 id, Status status) {
        require(_orders[id].status == status, "Escrow: wrong status");
        _;
    }

    constructor(address _arbiter) {
        require(_arbiter != address(0), "Escrow: arbiter is the zero address");
        arbiter = _arbiter;
    }

    function getOrder(uint256 id) public view returns (Order memory) {
        require(id < orderCount, "Escrow: order does not exist");
        return _orders[id];
    }

    // 买家创建订单。
    function createOrder(
        address seller,
        address token,
        uint256 amount,
        uint256 deadline,
        string memory description
    ) public returns (uint256) {
        require(seller != address(0), "Escrow: seller is zero address");
        require(msg.sender != seller, "Escrow: cannot create order to yourself");
        require(amount > 0, "Escrow: amount must be positive");
        require(deadline > block.timestamp, "Escrow: deadline must be in future");

        uint256 orderId = orderCount;
        _orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            token: token,
            amount: amount,
            deadline: deadline,
            status: Status.Created,
            description: description
        });
        orderCount++;

        emit OrderCreated(orderId, msg.sender, seller, token, amount, deadline);
        return orderId;
    }

    // 买家授权代币后付款，资金进入托管合约。
    function deposit(uint256 id) public onlyBuyer(id) inStatus(id, Status.Created) {
        Order storage order = _orders[id];
        order.status = Status.Paid;

        require(
            IERC20(order.token).transferFrom(msg.sender, address(this), order.amount),
            "Escrow: token transfer failed"
        );
        emit OrderPaid(id);
    }

    // 卖家只能对已付款、尚未发货的订单标记发货。
    function markShipped(uint256 id) public inStatus(id, Status.Paid) {
        Order storage order = _orders[id];
        require(msg.sender == order.seller, "Escrow: caller is not the seller");

        order.status = Status.Shipped;
        emit OrderShipped(id);
    }

    // 买家确认收货后，托管资金转给卖家。
    function confirm(uint256 id) public onlyBuyer(id) inStatus(id, Status.Shipped) {
        Order storage order = _orders[id];
        order.status = Status.Completed;

        require(
            IERC20(order.token).transfer(order.seller, order.amount),
            "Escrow: token transfer failed"
        );
        emit OrderCompleted(id);
    }

    // 已付款、尚未发货且超期时，买家可以直接退款。
    function refund(uint256 id) public onlyBuyer(id) inStatus(id, Status.Paid) {
        Order storage order = _orders[id];
        require(block.timestamp > order.deadline, "Escrow: deadline not reached");

        order.status = Status.Refunded;
        require(
            IERC20(order.token).transfer(order.buyer, order.amount),
            "Escrow: token transfer failed"
        );
        emit OrderRefunded(id);
    }

    // 付款后或发货后，买家和卖家都可以发起争议。
    function dispute(uint256 id) public {
        Order storage order = _orders[id];
        require(
            order.status == Status.Paid || order.status == Status.Shipped,
            "Escrow: wrong status"
        );
        require(
            msg.sender == order.buyer || msg.sender == order.seller,
            "Escrow: caller is not buyer or seller"
        );

        order.status = Status.Disputed;
        emit OrderDisputed(id, msg.sender);
    }

    // 仲裁人裁决争议。卖家胜诉则放款，买家胜诉则退款。
    function resolve(uint256 id, bool sellerWins) public onlyArbiter inStatus(id, Status.Disputed) {
        Order storage order = _orders[id];
        order.status = sellerWins ? Status.Completed : Status.Refunded;
        address recipient = sellerWins ? order.seller : order.buyer;

        require(
            IERC20(order.token).transfer(recipient, order.amount),
            "Escrow: token transfer failed"
        );
        emit OrderResolved(id, sellerWins);
    }
}