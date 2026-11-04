// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 简化版 IERC20 接口，用于代币转账
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MultiSigEscrow {
    // 【修改1】去掉了最后的 Resolved，直接复用原有的 Completed 和 Refunded，方便前端显示
    enum OrderStatus { Created, Paid, Completed, Refunded, Disputed }
    
    struct Order {
        address buyer;
        address seller;
        address token;
        uint256 amount;
        uint256 deadline;
        OrderStatus status;
        string description;
    }

    // 核心改动：仲裁人变成数组
    address[] public arbiters; 
    uint256 public constant REQUIRED_APPROVALS = 2; // 需要 2 人同意

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;

    // 记录每个订单的投票情况
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteSellerWins;
    mapping(uint256 => uint256) public sellerWinVotes;
    mapping(uint256 => uint256) public buyerWinVotes;

    // 限制只有仲裁人能调用
    modifier onlyArbiter() {
        bool isArb = false;
        for (uint i = 0; i < arbiters.length; i++) {
            if (arbiters[i] == msg.sender) {
                isArb = true;
                break;
            }
        }
        require(isArb, "Not an arbiter");
        _;
    }

    // 构造函数：传入两个仲裁人地址
    constructor(address _arbiter1, address _arbiter2) {
        require(_arbiter1 != address(0) && _arbiter2 != address(0), "Invalid arbiters");
        require(_arbiter1 != _arbiter2, "Arbiters must be different");
        arbiters.push(_arbiter1);
        arbiters.push(_arbiter2);
    }

    // 买家创建订单
    function createOrder(address _seller, address _token, uint256 _amount, uint256 _deadline, string memory _description) public {
        orders[orderCount] = Order({
            buyer: msg.sender,
            seller: _seller,
            token: _token,
            amount: _amount,
            deadline: _deadline,
            status: OrderStatus.Created,
            description: _description
        });
        orderCount++;
    }

    // 买家付款
    function deposit(uint256 _id) public {
        Order storage order = orders[_id];
        require(msg.sender == order.buyer, "Only buyer can deposit");
        require(order.status == OrderStatus.Created, "Invalid status");

        // 把买家的代币转到本合约，增加转账成功检查
        bool success = IERC20(order.token).transferFrom(order.buyer, address(this), order.amount);
        require(success, "Token transfer failed");
        order.status = OrderStatus.Paid;
    }

    // 买家确认收货
    function confirm(uint256 _id) public {
        Order storage order = orders[_id];
        require(msg.sender == order.buyer, "Only buyer can confirm");
        require(order.status == OrderStatus.Paid, "Invalid status");

        // 【修改2】先修改状态，再转账（防重入）
        order.status = OrderStatus.Completed;
        
        bool success = IERC20(order.token).transfer(order.seller, order.amount);
        require(success, "Token transfer failed");
    }

    // 发生争议
    function dispute(uint256 _id) public {
        Order storage order = orders[_id];
        require(msg.sender == order.buyer || msg.sender == order.seller, "Not participant");
        require(order.status == OrderStatus.Paid, "Invalid status");

        order.status = OrderStatus.Disputed;
    }

    // 核心改动：仲裁人投票表决
    function voteResolve(uint256 _id, bool _sellerWins) external onlyArbiter {
        Order storage order = orders[_id];
        require(order.status == OrderStatus.Disputed, "Order not disputed");
        require(!hasVoted[_id][msg.sender], "Already voted");

        hasVoted[_id][msg.sender] = true;
        voteSellerWins[_id][msg.sender] = _sellerWins;

        if (_sellerWins) {
            sellerWinVotes[_id]++;
            // 如果有人投了卖家赢，且买方票数不为 0，说明意见不合，直接 revert
            require(buyerWinVotes[_id] == 0, "Vote direction mismatch"); 
        } else {
            buyerWinVotes[_id]++;
            // 如果有人投了买家赢，且卖方票数不为 0，说明意见不合，直接 revert
            require(sellerWinVotes[_id] == 0, "Vote direction mismatch");
        }

        // 检查是否达成一致（两人意见相同且达到了要求数量）
        if (sellerWinVotes[_id] >= REQUIRED_APPROVALS) {
            _executeResolution(_id, true);
        } else if (buyerWinVotes[_id] >= REQUIRED_APPROVALS) {
            _executeResolution(_id, false);
        }
    }

    // 内部执行函数
    function _executeResolution(uint256 _id, bool _sellerWins) internal {
        Order storage order = orders[_id];
        
        // 【修改3】先改状态，后转账（防重入）
        if (_sellerWins) {
            order.status = OrderStatus.Completed;
            bool success = IERC20(order.token).transfer(order.seller, order.amount);
            require(success, "Token transfer to seller failed");
        } else {
            order.status = OrderStatus.Refunded;
            bool success = IERC20(order.token).transfer(order.buyer, order.amount);
            require(success, "Token transfer to buyer failed");
        }
    }
}